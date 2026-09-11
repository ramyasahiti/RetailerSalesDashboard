using Microsoft.Data.Sqlite;
using RetailerSales.Api.Models;

namespace RetailerSales.Api.Data;

public class SqliteSalesSummaryRepository
{
    private readonly string _connectionString;

    public SqliteSalesSummaryRepository(IConfiguration configuration)
    {
        _connectionString =
            configuration.GetConnectionString("SQLite")
            ?? throw new InvalidOperationException(
                "SQLite connection string is not configured.");
    }

    public async Task SaveResultsAsync(
        IEnumerable<SalesSummaryResult> results)
    {
        await using var connection =
            new SqliteConnection(_connectionString);

        await connection.OpenAsync();

        using var transaction = connection.BeginTransaction();

        try
        {
            foreach (var result in results)
            {
                await using var command = connection.CreateCommand();

                command.Transaction = transaction;

                command.CommandText = """
                    INSERT INTO SalesSummaryResults
                    (
                        RequestId,
                        RetailerId,
                        Geography,
                        DateFrom,
                        DateTo,
                        SalesCount,
                        TotalSales,
                        GeneratedOn
                    )
                    VALUES
                    (
                        $requestId,
                        $retailerId,
                        $geography,
                        $dateFrom,
                        $dateTo,
                        $salesCount,
                        $totalSales,
                        $generatedOn
                    );
                    """;

                command.Parameters.AddWithValue(
                    "$requestId",
                    result.RequestId);

                command.Parameters.AddWithValue(
                    "$retailerId",
                    result.RetailerId);

                command.Parameters.AddWithValue(
                    "$geography",
                    result.Geography);

                command.Parameters.AddWithValue(
                    "$dateFrom",
                    result.DateFrom);

                command.Parameters.AddWithValue(
                    "$dateTo",
                    result.DateTo);

                command.Parameters.AddWithValue(
                    "$salesCount",
                    result.SalesCount);

                command.Parameters.AddWithValue(
                    "$totalSales",
                    result.TotalSales);

                command.Parameters.AddWithValue(
                    "$generatedOn",
                    result.GeneratedOn);

                await command.ExecuteNonQueryAsync();
            }

            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }
}