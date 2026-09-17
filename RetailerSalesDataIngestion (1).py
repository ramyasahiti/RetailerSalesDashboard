# Databricks notebook source
#It simply reads SalesTransactions.csv from the volume and displays it.
df = spark.read \
    .option("header", "true") \
    .option("inferSchema", "true") \
    .csv("/Volumes/workspace/default/retailer_sales_data/SalesTransactions.csv")

display(df)

# COMMAND ----------

#total number of cells
print("Total transactions:", df.count())

# COMMAND ----------

# ============================================================
# Load SQLite CSV files into Databricks tables
# ============================================================

base_path = "/Volumes/workspace/default/retailer_sales_data"

tables = {
    "BrandMaster": "BrandMaster.csv",
    "ProductMaster": "ProductMaster.csv",
    "GeographyMaster": "GeographyMaster.csv",
    "RetailerMaster": "RetailerMaster.csv",
    "SalesTransactions": "SalesTransactions.csv"
}

for table_name, file_name in tables.items():

    file_path = f"{base_path}/{file_name}"

    df = (
        spark.read
        .option("header", "true")
        .option("inferSchema", "true")
        .csv(file_path)
    )

    df.write \
        .mode("overwrite") \
        .option("overwriteSchema", "true") \
        .saveAsTable(table_name)

    print(f"{table_name} loaded successfully. Rows: {df.count()}")

# COMMAND ----------

display(spark.sql("SHOW TABLES"))

# COMMAND ----------

for table_name in [
    "BrandMaster",
    "ProductMaster",
    "GeographyMaster",
    "RetailerMaster",
    "SalesTransactions"
]:
    print(f"\n===== {table_name} =====")
    try:
        spark.sql(f"DESCRIBE DETAIL {table_name}").select(
            "name",
            "format"
        ).show(truncate=False)
    except Exception as e:
        print("Table does not exist yet.")

# COMMAND ----------

tables = [

    "BrandMaster",

    "ProductMaster",

    "GeographyMaster",

    "RetailerMaster",

    "SalesTransactions"

]
 
for table_name in tables:

    print(f"{table_name}: {spark.table(table_name).count()} rows")
 

# COMMAND ----------

print("Current catalog:", spark.catalog.currentCatalog())

print("Current database/schema:", spark.catalog.currentDatabase())
 

# COMMAND ----------

display(spark.sql("DESCRIBE DETAIL retailermaster"))

# COMMAND ----------

display(spark.sql("DESCRIBE DETAIL SalesTransactions"))
 

# COMMAND ----------

display(

    spark.table("GeographyMaster")

    .orderBy("GeographyId")

)
 

# COMMAND ----------

from pyspark.sql.functions import col
 
base_path = "/Volumes/workspace/default/retailer_sales_data"
 
 
# ============================================================

# BRAND MASTER

# ============================================================
 
brand_df = (

    spark.read

    .option("header", "true")

    .option("inferSchema", "true")

    .csv(f"{base_path}/BrandMaster.csv")

)
 
brand_df = brand_df.select(

    col("BrandId").cast("INT"),

    col("BrandName").cast("STRING")

)
 
brand_df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable("workspace.default.BrandMaster")
 
 
# ============================================================

# PRODUCT MASTER

# ============================================================
 
product_df = (

    spark.read

    .option("header", "true")

    .option("inferSchema", "true")

    .csv(f"{base_path}/ProductMaster.csv")

)
 
product_df = product_df.select(

    col("ProductId").cast("INT"),

    col("ProductName").cast("STRING"),

    col("ProductCategory").cast("STRING"),

    col("BrandId").cast("INT"),

    col("UnitPrice").cast("DOUBLE")

)
 
product_df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable("workspace.default.ProductMaster")
 
 
# ============================================================

# GEOGRAPHY MASTER

# ============================================================
 
geography_df = (

    spark.read

    .option("header", "true")

    .option("inferSchema", "true")

    .csv(f"{base_path}/GeographyMaster.csv")

)
 
geography_df = geography_df.select(

    col("GeographyId").cast("INT"),

    col("GeographyName").cast("STRING")

)
 
geography_df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable("workspace.default.GeographyMaster")
 
 
# ============================================================

# RETAILER MASTER

# ============================================================
 
retailer_df = (

    spark.read

    .option("header", "true")

    .option("inferSchema", "true")

    .csv(f"{base_path}/RetailerMaster.csv")

)
 
retailer_df = retailer_df.select(

    col("RetailerId").cast("INT"),

    col("RetailerName").cast("STRING")

)
 
retailer_df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable("workspace.default.RetailerMaster")
 
 
# ============================================================

# SALES TRANSACTIONS

# ============================================================
 
sales_df = (

    spark.read

    .option("header", "true")

    .option("inferSchema", "true")

    .csv(f"{base_path}/SalesTransactions.csv")

)
 
sales_df = sales_df.select(

    col("TransactionId").cast("INT"),

    col("RetailerId").cast("INT"),

    col("ProductId").cast("INT"),

    col("GeographyId").cast("INT"),

    col("SaleDate").cast("DATE"),

    col("Quantity").cast("INT"),

    col("SaleAmount").cast("DOUBLE"),

    col("TransactionStatus").cast("STRING"),

    col("PaymentMode").cast("STRING"),

    col("CreatedOn").cast("TIMESTAMP"),

    col("UpdatedOn").cast("TIMESTAMP"),

    col("IsDeleted").cast("INT")

)
 
sales_df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable("workspace.default.SalesTransactions")
 
 
print("All five Delta tables have been refreshed from SQLite CSV data.")
 

# COMMAND ----------

for table_name in [

    "BrandMaster",

    "ProductMaster",

    "GeographyMaster",

    "RetailerMaster",

    "SalesTransactions"

]:

    print(

        f"{table_name}: "

        f"{spark.table('workspace.default.' + table_name).count()} rows"

    )
 

# COMMAND ----------

from pyspark.sql.functions import col

base_path = "/Volumes/workspace/default/retailer_sales_data"

# ------------------------------------------------------------
# RetailerMaster
# ------------------------------------------------------------

retailer_df = (
    spark.read
    .option("header", "true")
    .option("inferSchema", "true")
    .csv(f"{base_path}/RetailerMaster.csv")
)

retailer_df = retailer_df.select(
    col("RetailerId").cast("INT"),
    col("RetailerName").cast("STRING")
)

retailer_df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable("workspace.default.RetailerMaster")


# ------------------------------------------------------------
# SalesTransactions
# ------------------------------------------------------------

sales_df = (
    spark.read
    .option("header", "true")
    .option("inferSchema", "true")
    .csv(f"{base_path}/SalesTransactions.csv")
)

sales_df = sales_df.select(
    col("TransactionId").cast("INT"),
    col("RetailerId").cast("INT"),
    col("ProductId").cast("INT"),
    col("GeographyId").cast("INT"),
    col("SaleDate").cast("DATE"),
    col("Quantity").cast("INT"),
    col("SaleAmount").cast("DOUBLE"),
    col("TransactionStatus").cast("STRING"),
    col("PaymentMode").cast("STRING"),
    col("CreatedOn").cast("TIMESTAMP"),
    col("UpdatedOn").cast("TIMESTAMP"),
    col("IsDeleted").cast("INT")
)

sales_df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable("workspace.default.SalesTransactions")

print("RetailerMaster and SalesTransactions refreshed.")

# COMMAND ----------

print(
    "Retailers:",
    spark.table("workspace.default.RetailerMaster").count()
)

print(
    "Transactions:",
    spark.table("workspace.default.SalesTransactions").count()
)

# COMMAND ----------

display(
    spark.table("workspace.default.RetailerMaster")
    .orderBy("RetailerId")
)