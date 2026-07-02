using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Contracts.Jobs;
using TradeLike.Api.Contracts.Pagination;
using TradeLike.Api.Contracts.Quotes;
using TradeLike.Api.Models;
using TradeLike.Api.Security;
using TradeLike.Api.Services;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireEmployeeRole")]
public class JobsController : ControllerBase
{
    private readonly IJobService _jobService;

    public JobsController(IJobService jobService)
    {
        _jobService = jobService;
    }

    [HttpGet]
    public async Task<ActionResult<List<JobResponse>>> GetJobs()
    {
        var jobs = await _jobService.GetAllAsync(TenantHelpers.GetTenantId(HttpContext));
        return Ok(jobs.Select(ToResponse).ToList());
    }

    [HttpGet("paged")]
    public async Task<ActionResult<object>> GetJobsPaged([FromQuery] PagedQuery query)
    {
        var jobs = await _jobService.GetPagedAsync(TenantHelpers.GetTenantId(HttpContext), query);

        return Ok(PagedResponse<JobResponse>.Create(
            jobs.Items.Select(ToResponse).ToList(),
            jobs.Page,
            jobs.PageSize,
            jobs.TotalItems));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<JobResponse>> GetJob(int id)
    {
        var job = await _jobService.GetByIdAsync(id, TenantHelpers.GetTenantId(HttpContext));
        if (job is null) return NotFound();
        return Ok(ToResponse(job));
    }

    [HttpPost]
    public async Task<ActionResult<JobResponse>> CreateJob([FromBody] CreateJobRequest request)
    {
        try
        {
            var created = await _jobService.CreateAsync(request, TenantHelpers.GetTenantId(HttpContext));
            var response = ToResponse(created);
            return CreatedAtAction(nameof(GetJob), new { id = response.Id }, response);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<JobResponse>> UpdateJob(int id, [FromBody] UpdateJobRequest request)
    {
        try
        {
            var updated = await _jobService.UpdateAsync(id, request, TenantHelpers.GetTenantId(HttpContext));
            if (updated is null) return NotFound();
            return Ok(ToResponse(updated));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<JobResponse>> DeleteJob(int id)
    {
        var deleted = await _jobService.DeleteAsync(id, TenantHelpers.GetTenantId(HttpContext));
        if (deleted is null) return NotFound();
        return Ok(ToResponse(deleted));
    }

    [HttpGet("today")]
    public async Task<ActionResult<List<JobResponse>>> GetTodayJobs()
    {
        var jobs = await _jobService.GetTodayAsync(TenantHelpers.GetTenantId(HttpContext));
        return Ok(jobs.Select(ToResponse).ToList());
    }

    [HttpGet("week")]
    public async Task<ActionResult<List<JobResponse>>> GetWeekJobs([FromQuery] DateTime? start)
    {
        var weekStart = start?.Date ?? DateTime.Today;
        var jobs = await _jobService.GetWeekAsync(weekStart, TenantHelpers.GetTenantId(HttpContext));
        return Ok(jobs.Select(ToResponse).ToList());
    }

    [HttpPut("{id:int}/source-quote")]
    public async Task<ActionResult<JobResponse>> LinkSourceQuote(int id, [FromBody] LinkQuoteToJobRequest request)
    {
        try
        {
            var updated = await _jobService.LinkQuoteAsync(id, request.QuoteId, TenantHelpers.GetTenantId(HttpContext));
            if (updated is null) return NotFound();
            return Ok(ToResponse(updated));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:int}/source-quote")]
    public async Task<ActionResult<JobResponse>> UnlinkSourceQuote(int id)
    {
        var updated = await _jobService.UnlinkQuoteAsync(id, TenantHelpers.GetTenantId(HttpContext));
        if (updated is null) return NotFound();
        return Ok(ToResponse(updated));
    }

    private static JobResponse ToResponse(Job job)
    {
        return new JobResponse
        {
            Id = job.Id,
            JobNumber = job.JobNumber,
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

public sealed class JobResponse
{
    public int Id { get; init; }

    public int? JobNumber { get; init; }

    public int? CustomerId { get; init; }

    public string Customer { get; init; } = string.Empty;

    public string Phone { get; init; } = string.Empty;

    public string JobTitle { get; init; } = string.Empty;

    public string Address { get; init; } = string.Empty;

    public DateTime ScheduledDate { get; init; }

    public string Status { get; init; } = string.Empty;

    public string Priority { get; init; } = string.Empty;

    public string? Notes { get; init; }

    public int? QuoteId { get; init; }

    public int? EngineerId { get; init; }

    public QuoteResponse? SourceQuote { get; init; }
}
