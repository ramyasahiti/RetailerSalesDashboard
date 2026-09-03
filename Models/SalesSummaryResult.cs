public class SalesSummaryResult
{
    public int ResultId { get; set; }

    public string RequestId { get; set; } = string.Empty;

    public int RetailerId { get; set; }

    public string Geography { get; set; } = string.Empty;

    public string DateFrom { get; set; } = string.Empty;

    public string DateTo { get; set; } = string.Empty;

    public int SalesCount { get; set; }

    public double TotalSales { get; set; }

    public string GeneratedOn { get; set; } = string.Empty;
}