using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Contracts.Quotes;
using TradeLike.Api.Models;
using TradeLike.Api.Security;
using TradeLike.Api.Services;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireCustomerRole")]
[Route("api/calendar")]
public sealed class CalendarController : ControllerBase
{
    private readonly IJobService _jobService;

    public CalendarController(IJobService jobService)
    {
        _jobService = jobService;
    }

    [HttpGet("week")]
    public async Task<ActionResult<List<JobResponse>>> GetWeekJobs([FromQuery] DateTime? start)
    {
        var weekStart = start?.Date ?? DateTime.Today;
        var jobs = await _jobService.GetWeekAsync(weekStart, TenantHelpers.GetTenantId(HttpContext));
        return Ok(jobs.Select(ToResponse).ToList());
    }

    private static JobResponse ToResponse(Job job)
    {
        return new JobResponse
        {
            Id = job.Id,
            CustomerId = job.Quote?.CustomerId,
            Customer = job.Customer,
            Phone = job.Phone,
            JobTitle = job.JobTitle,
            Address = job.Address,
            ScheduledDate = job.ScheduledDate,
            Status = job.Status,
            Priority = job.Priority,
            Notes = job.Notes,
            QuoteId = job.QuoteId,
            EngineerId = job.EngineerId,
            SourceQuote = job.Quote is null ? null : ToQuoteResponse(job.Quote)
        };
    }

    private static QuoteResponse ToQuoteResponse(Quote quote)
    {
        return new QuoteResponse
        {
            Id = quote.Id,
            CustomerId = quote.CustomerId,
            CustomerName = quote.CustomerName,
            Title = quote.Title,
            Description = quote.Description,
            Amount = quote.Amount,
            Subtotal = quote.Subtotal,
            VatTotal = quote.VatTotal,
            DiscountTotal = quote.DiscountTotal,
            Total = quote.Total,
            Status = quote.Status,
            Notes = quote.Notes,
            CreatedAt = quote.CreatedAt,
            LineItems = quote.LineItems.OrderBy(item => item.Id).Select(ToQuoteLineItemResponse).ToList()
        };
    }

    private static QuoteLineItemResponse ToQuoteLineItemResponse(QuoteLineItem item)
    {
        return new QuoteLineItemResponse
        {
            Id = item.Id,
            QuoteId = item.QuoteId,
            Type = item.Type,
            Description = item.Description,
            Quantity = item.Quantity,
            UnitPrice = item.UnitPrice,
            VatRate = item.VatRate,
            LineTotal = item.LineTotal
        };
    }
}
