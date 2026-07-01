using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Analytics;

[ApiController]
[Authorize(Policy = "RequireManagerRole")]
[Route("api/analytics")]
public sealed class AnalyticsController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public AnalyticsController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet("revenue")]
    public async Task<ActionResult<IReadOnlyList<RevenuePointResponse>>> GetRevenue(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var range = DateRange.Create(from, to);

        var rows = await _context.Invoices
            .AsNoTracking()
            .Where(invoice =>
                invoice.TenantId == tenantId &&
                invoice.CreatedAt >= range.From &&
                invoice.CreatedAt < range.ToExclusive)
            .GroupBy(invoice => invoice.CreatedAt.Date)
            .Select(group => new RevenuePointResponse(
                group.Key,
                group.Sum(invoice => invoice.TotalPence),
                group.Count(),
                group.Count(invoice => invoice.Status == "Paid")))
            .OrderBy(point => point.Date)
            .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("job-completion")]
    public async Task<ActionResult<IReadOnlyList<JobCompletionPointResponse>>> GetJobCompletion(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var range = DateRange.Create(from, to);

        var rows = await _context.Jobs
            .AsNoTracking()
            .Where(job =>
                job.TenantId == tenantId &&
                job.ScheduledDate >= range.From &&
                job.ScheduledDate < range.ToExclusive)
            .GroupBy(job => job.ScheduledDate.Date)
            .Select(group => new JobCompletionPointResponse(
                group.Key,
                group.Count(job => job.Status == "Completed"),
                group.Count(job => job.Status == "InProgress"),
                group.Count(job => job.Status == "Scheduled"),
                group.Count(job => job.Status == "Cancelled")))
            .OrderBy(point => point.Date)
            .ToListAsync();

        return Ok(rows);
    }

    private sealed record DateRange(DateTime From, DateTime ToExclusive)
    {
        public static DateRange Create(DateTime? from, DateTime? to)
        {
            var end = (to ?? DateTime.UtcNow).Date.AddDays(1);
            var start = (from ?? end.AddDays(-30)).Date;

            return start >= end
                ? new DateRange(end.AddDays(-30), end)
                : new DateRange(start, end);
        }
    }
}

public sealed record RevenuePointResponse(
    DateTime Date,
    int RevenuePence,
    int InvoiceCount,
    int PaidInvoiceCount);

public sealed record JobCompletionPointResponse(
    DateTime Date,
    int Completed,
    int InProgress,
    int Scheduled,
    int Cancelled);
