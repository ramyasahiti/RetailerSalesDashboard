using System.Text.Json;
using RetailerSales.Api.Clients;
using RetailerSales.Api.Data;
using RetailerSales.Api.Models;

namespace RetailerSales.Api.Services;

public class SalesSummaryService
{
    private readonly DatabricksClient _databricksClient;
    private readonly SqliteSalesSummaryRepository _repository;

    public SalesSummaryService(
        DatabricksClient databricksClient,
        SqliteSalesSummaryRepository repository)
    {
        _databricksClient = databricksClient;
        _repository = repository;
    }

    public async Task<object> GetSalesSummaryAsync(
        SalesSummaryRequest request)
    {
        // ----------------------------------------------------
        // 1. Generate a unique request ID
        // ----------------------------------------------------

        var requestId = Guid.NewGuid().ToString();

        // ----------------------------------------------------
        // 2. Start the Databricks Job
        // ----------------------------------------------------

        var runResponse = await _databricksClient.RunJobAsync(
            request.Geography,
            request.DateFrom?.ToString("yyyy-MM-dd") ?? "",
            request.DateTo?.ToString("yyyy-MM-dd") ?? "",
            requestId);

        using var runJson = JsonDocument.Parse(runResponse);

        var parentRunId = runJson.RootElement
            .GetProperty("run_id")
            .GetInt64();

        // ----------------------------------------------------
        // 3. Wait for Databricks Job to finish
        // ----------------------------------------------------

        JsonElement statusRoot;

        while (true)
        {
            var statusResponse =
                await _databricksClient.GetRunStatusAsync(parentRunId);

            Console.WriteLine("===== DATABRICKS RUN STATUS =====");
            Console.WriteLine(statusResponse);
            Console.WriteLine("=================================");

            using var statusJson =
                JsonDocument.Parse(statusResponse);

            statusRoot = statusJson.RootElement.Clone();

            var lifeCycleState = statusRoot
                .GetProperty("state")
                .GetProperty("life_cycle_state")
                .GetString();

            if (lifeCycleState == "TERMINATED")
            {
                var resultState = statusRoot
                    .GetProperty("state")
                    .GetProperty("result_state")
                    .GetString();

                if (resultState != "SUCCESS")
                {
                    throw new Exception(
                        $"Databricks Job failed. Result state: {resultState}");
                }

                break;
            }

            if (lifeCycleState == "INTERNAL_ERROR" ||
                lifeCycleState == "SKIPPED")
            {
                throw new Exception(
                    $"Databricks Job did not complete successfully. State: {lifeCycleState}");
            }

            
        }

        // ----------------------------------------------------
        // 4. Find the notebook task run
        // ----------------------------------------------------

        var tasks = statusRoot.GetProperty("tasks");

        if (tasks.GetArrayLength() == 0)
        {
            throw new Exception(
                "Databricks Job completed but no task run was found.");
        }

        var taskRunId = tasks[0]
            .GetProperty("run_id")
            .GetInt64();

        // ----------------------------------------------------
        // 5. Get notebook output
        // ----------------------------------------------------

        var outputResponse =
            await _databricksClient.GetRunOutputAsync(taskRunId);

        using var outputJson =
            JsonDocument.Parse(outputResponse);

        var notebookOutput = outputJson.RootElement
            .GetProperty("notebook_output")
            .GetProperty("result")
            .GetString();

        if (string.IsNullOrWhiteSpace(notebookOutput))
        {
            throw new Exception(
                "Databricks completed successfully but returned no notebook output.");
        }

        // ----------------------------------------------------
        // 6. Parse Databricks JSON
        // ----------------------------------------------------

        using var resultJson =
            JsonDocument.Parse(notebookOutput);

        var root = resultJson.RootElement;

        var geography = root
            .GetProperty("geography")
            .GetString() ?? request.Geography;

        var dateFrom = root
            .GetProperty("dateFrom")
            .GetString()
            ?? request.DateFrom?.ToString("yyyy-MM-dd")
            ?? "";

        var dateTo = root
            .GetProperty("dateTo")
            .GetString()
            ?? request.DateTo?.ToString("yyyy-MM-dd")
            ?? "";

        var retailers = root
            .GetProperty("retailers");

        // ----------------------------------------------------
        // 7. Calculate total sales count
        //
        // This is the same calculation currently performed
        // by Angular.
        // ----------------------------------------------------

        var totalSales = retailers
            .EnumerateArray()
            .Sum(retailer =>
                retailer
                    .GetProperty("salesCount")
                    .GetInt32());

        // ----------------------------------------------------
        // 8. Create records for SalesSummaryResults
        // ----------------------------------------------------

        var generatedOn = DateTime.Now
            .ToString("yyyy-MM-dd HH:mm:ss");

        var databaseResults =
            new List<SalesSummaryResult>();

        foreach (var retailer in retailers.EnumerateArray())
        {
            var retailerId = retailer
                .GetProperty("retailerId")
                .GetInt32();

            var salesCount = retailer
                .GetProperty("salesCount")
                .GetInt32();

            databaseResults.Add(
                new SalesSummaryResult
                {
                    RequestId = requestId,
                    RetailerId = retailerId,
                    Geography = geography,
                    DateFrom = dateFrom,
                    DateTo = dateTo,
                    SalesCount = salesCount,
                    TotalSales = totalSales,
                    GeneratedOn = generatedOn
                });
        }

        // ----------------------------------------------------
        // 9. Persist results to SQLite
        // ----------------------------------------------------

        if (databaseResults.Count > 0)
        {
            await _repository.SaveResultsAsync(
                databaseResults);
        }

        // ----------------------------------------------------
        // 10. Return the same response structure
        //     that Angular currently expects
        // ----------------------------------------------------

        return JsonSerializer.Deserialize<object>(
            notebookOutput)!;
    }
}