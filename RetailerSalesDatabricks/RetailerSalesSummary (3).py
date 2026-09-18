# Databricks notebook source
dbutils.widgets.text("geography", "")
dbutils.widgets.text("dateFrom", "")
dbutils.widgets.text("dateTo", "")
dbutils.widgets.text("requestId", "")

geography = dbutils.widgets.get("geography")
date_from = dbutils.widgets.get("dateFrom")
date_to = dbutils.widgets.get("dateTo")
request_id = dbutils.widgets.get("requestId")

# COMMAND ----------

from datetime import datetime, date
from dateutil.relativedelta import relativedelta

if not geography:
    raise ValueError("Geography is required.")

# If both dates are omitted, use the last 2 months
if not date_from and not date_to:
    today = date.today()
    from_date = today - relativedelta(months=2)
    to_date = today

    date_from = from_date.strftime("%Y-%m-%d")
    date_to = to_date.strftime("%Y-%m-%d")

# If only one date is provided, reject the request
elif date_from and not date_to:
    raise ValueError("Both DateFrom and DateTo must be provided together.")

elif not date_from and date_to:
    raise ValueError("Both DateFrom and DateTo must be provided together.")

# If both dates are provided, validate them
else:
    try:
        from_date = datetime.strptime(
            date_from, "%Y-%m-%d"
        ).date()

        to_date = datetime.strptime(
            date_to, "%Y-%m-%d"
        ).date()

    except ValueError:
        raise ValueError(
            "Dates must be in YYYY-MM-DD format."
        )

    if from_date > to_date:
        raise ValueError(
            "DateFrom cannot be later than DateTo."
        )

print(f"Geography: {geography}")
print(f"Date range used: {date_from} to {date_to}")
 

# COMMAND ----------

from pyspark.sql.functions import col, count, sum as spark_sum, broadcast

sales_df = spark.table("workspace.default.SalesTransactions")

retailer_df = (
    spark.table("workspace.default.RetailerMaster")
    .select("RetailerId", "RetailerName")
)

product_df = (
    spark.table(
        "workspace.default.ProductMaster"
    )
    .select(
        "ProductId",
        "ProductName"
    )
)

geography_df = (
    spark.table("workspace.default.GeographyMaster")
    .select("GeographyId", "GeographyName")
)
 

# COMMAND ----------

if geography == "All Geographies":

    geography_id = None

else:

    geography_row = (
        geography_df
        .filter(col("GeographyName") == geography)
        .select("GeographyId")
        .first()
    )

    if geography_row is None:
        raise ValueError(
            f"Geography '{geography}' was not found."
        )

    geography_id = geography_row["GeographyId"]

# COMMAND ----------

filtered_sales = sales_df.filter(
    (col("TransactionStatus") == "Success") &
    (col("IsDeleted") == 0) &
    (col("SaleDate") >= date_from) &
    (col("SaleDate") <= date_to)
)

if geography_id is not None:
    filtered_sales = filtered_sales.filter(
        col("GeographyId") == geography_id
    )

# COMMAND ----------

import time

start = time.time()

result_df = (
    filtered_sales
    .join(
        broadcast(retailer_df),
        filtered_sales.RetailerId == retailer_df.RetailerId,
        "inner"
    )
    .groupBy(
        retailer_df.RetailerId,
        retailer_df.RetailerName
    )
    .agg(
        count("TransactionId").alias("SalesCount")
    )
    .orderBy(
        col("SalesCount").desc()
    )
)

print(
    f"Join + aggregation + collect took: "
    f"{time.time() - start:.2f} seconds"
)

# ============================================================
# RETAILER + PRODUCT SALES
# ============================================================

retailer_product_result_df = (
    filtered_sales

    .join(
        broadcast(retailer_df),
        filtered_sales.RetailerId == retailer_df.RetailerId,
        "inner"
    )

    .join(
        broadcast(product_df),
        filtered_sales.ProductId == product_df.ProductId,
        "left"
    )

    .groupBy(
        retailer_df.RetailerId,
        retailer_df.RetailerName,
        product_df.ProductId,
        product_df.ProductName
    )

    .agg(
        count(
            filtered_sales.TransactionId
        ).alias("SalesCount")
    )

    .orderBy(
        retailer_df.RetailerId,
        col("SalesCount").desc()
    )
)

# COMMAND ----------

import time
start = time.time()

product_result_df = (

    filtered_sales

    .join(

        broadcast(product_df),

        filtered_sales.ProductId
        == product_df.ProductId,

        "left"

    )

    .groupBy(

        product_df.ProductId,

        product_df.ProductName

    )

    .agg(

        count("TransactionId")
        .alias("SalesCount")

    )

    .orderBy(

        col("SalesCount").desc()

    )

)

print(
    f"Product join + aggregation took: "
    f"{time.time() - start:.2f} seconds"
)

# COMMAND ----------

import json

# ============================================================
# RETAILER + PRODUCT DETAILS
# ============================================================

retailer_product_rows = (
    retailer_product_result_df.collect()
)

retailers = []

for row in result_df.collect():

    retailer_products = [

        {
            "productId": product_row["ProductId"],
            "productName": product_row["ProductName"],
            "salesCount": product_row["SalesCount"]
        }

        for product_row in retailer_product_rows

        if product_row["RetailerId"] == row["RetailerId"]
    ]


    retailers.append(
        {
            "retailerId": row["RetailerId"],
            "retailerName": row["RetailerName"],
            "salesCount": row["SalesCount"],
            "products": retailer_products
        }
    )


# ============================================================
# OVERALL PRODUCT-WISE SALES
# ============================================================

products = [

    {
        "productId": row["ProductId"],
        "productName": row["ProductName"],
        "salesCount": row["SalesCount"]
    }

    for row in product_result_df.collect()
]


# ============================================================
# FINAL RESPONSE
# ============================================================

response = {

    "requestId": request_id,

    "geography": geography,

    "dateFrom": date_from,

    "dateTo": date_to,

    "totalRetailers": len(retailers),

    "retailers": retailers,

    "products": products
}


# ============================================================
# RETURN JSON TO BACKEND
# ============================================================

dbutils.notebook.exit(
    json.dumps(response)
)
