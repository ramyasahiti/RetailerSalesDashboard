using Microsoft.AspNetCore.Mvc;
using RetailerSales.Api.Models;
using RetailerSales.Api.Services;

namespace RetailerSales.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SalesSummaryController : ControllerBase
{
    private readonly SalesSummaryService _salesSummaryService;

    public SalesSummaryController(
        SalesSummaryService salesSummaryService)
    {
        _salesSummaryService = salesSummaryService;
    }

    [HttpPost]
    public async Task<IActionResult> GetSalesSummary(
        [FromBody] SalesSummaryRequest request)
    {
        // ------------------------------------------
        // GEOGRAPHY IS REQUIRED
        // ------------------------------------------

        if (string.IsNullOrWhiteSpace(request.Geography))
        {
            return BadRequest(new
            {
                message = "Geography is required."
            });
        }

        // ------------------------------------------
        // DATE RANGE IS OPTIONAL
        //
        // Both dates empty  -> allowed
        // Both dates filled -> allowed
        // Only one date     -> validation error
        // ------------------------------------------

        if (request.DateFrom.HasValue &&
            !request.DateTo.HasValue)
        {
            return BadRequest(new
            {
                message = "Please enter End Date."
            });
        }

        if (!request.DateFrom.HasValue &&
            request.DateTo.HasValue)
        {
            return BadRequest(new
            {
                message = "Please enter Start Date."
            });
        }

        // ------------------------------------------
        // FROM DATE CANNOT BE AFTER TO DATE
        // ------------------------------------------

        if (request.DateFrom.HasValue &&
            request.DateTo.HasValue &&
            request.DateFrom > request.DateTo)
        {
            return BadRequest(new
            {
                message = "DateFrom cannot be later than DateTo."
            });
        }

        // ------------------------------------------
        // BOTH DATES EMPTY IS VALID
        //
        // Databricks will apply the default
        // Last 2 months date range.
        // ------------------------------------------

        var result =
            await _salesSummaryService.GetSalesSummaryAsync(
                request);

        return Ok(result);
    }
}