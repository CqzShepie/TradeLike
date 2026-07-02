using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Security;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Policy = "RequireManagerRole")]
public sealed class ReportsController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public ReportsController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ReportsSummaryResponse>> GetSummary([FromQuery] string? range = null)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var dateRange = ResolveRange(range);
        var previousRange = new DateRange(
            dateRange.FromUtc.AddDays(-(dateRange.ToUtc - dateRange.FromUtc).TotalDays),
            dateRange.FromUtc);

        var tenantJobs = _context.Jobs.AsNoTracking().Where(job => job.TenantId == tenantId);
        var rangeJobs = tenantJobs.Where(job => job.ScheduledDate >= dateRange.FromUtc && job.ScheduledDate < dateRange.ToUtc);
        var previousJobs = tenantJobs.Where(job => job.ScheduledDate >= previousRange.FromUtc && job.ScheduledDate < previousRange.ToUtc);
        var openJobs = tenantJobs.Where(job => job.Status == "Scheduled" || job.Status == "InProgress");

        var completedThisRange = await rangeJobs.CountAsync(job => job.Status == "Completed");
        var completedPreviousRange = await previousJobs.CountAsync(job => job.Status == "Completed");
        var scheduledThisRange = await rangeJobs.CountAsync();
        var openJobCount = await openJobs.CountAsync();
        var overdueJobs = await openJobs.CountAsync(job => job.ScheduledDate < DateTime.UtcNow);
        var totalRangeJobs = await rangeJobs.CountAsync();

        var days = Math.Max(1, (dateRange.ToUtc - dateRange.FromUtc).TotalDays);
        var completionRate = totalRangeJobs == 0
            ? 0
            : Math.Round((decimal)completedThisRange / totalRangeJobs * 100, 1);

        return Ok(new ReportsSummaryResponse(
            dateRange.FromUtc,
            dateRange.ToUtc,
            completedThisRange,
            completedPreviousRange,
            scheduledThisRange,
            openJobCount,
            overdueJobs,
            Math.Round(completedThisRange / (decimal)Math.Max(1, days / 7), 1),
            Math.Round(completedThisRange / (decimal)Math.Max(1, days / 30), 1),
            completionRate));
    }

    [HttpGet("jobs")]
    public async Task<ActionResult<IReadOnlyList<JobReportRow>>> GetJobs([FromQuery] string? range = null)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var dateRange = ResolveRange(range);

        var rows = await _context.Jobs
            .AsNoTracking()
            .Where(job =>
                job.TenantId == tenantId &&
                job.ScheduledDate >= dateRange.FromUtc &&
                job.ScheduledDate < dateRange.ToUtc)
            .GroupBy(job => job.Status)
            .Select(group => new JobReportRow(group.Key, group.Count()))
            .OrderBy(row => row.Status)
            .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("team")]
    [PlanGuard(Feature.TeamManagement)]
    public async Task<ActionResult<TeamReportResponse>> GetTeam([FromQuery] string? range = null)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var dateRange = ResolveRange(range);

        var members = await _context.CustomerStaffMembers
            .AsNoTracking()
            .Where(member => member.CompanyUserId == tenantId)
            .ToListAsync();

        var assignments = await _context.JobAssignments
            .AsNoTracking()
            .Include(assignment => assignment.StaffMembers)
            .Include(assignment => assignment.Job)
            .Where(assignment =>
                assignment.TenantId == tenantId &&
                assignment.Job.ScheduledDate >= dateRange.FromUtc &&
                assignment.Job.ScheduledDate < dateRange.ToUtc)
            .ToListAsync();

        var assignedJobIds = assignments.Select(assignment => assignment.JobId).Distinct().ToList();
        var unassignedJobs = await _context.Jobs
            .AsNoTracking()
            .CountAsync(job =>
                job.TenantId == tenantId &&
                job.ScheduledDate >= dateRange.FromUtc &&
                job.ScheduledDate < dateRange.ToUtc &&
                !assignedJobIds.Contains(job.Id));

        var rows = members
            .Select(member =>
            {
                var jobs = assignments.Where(assignment =>
                    assignment.LeadStaffMemberId == member.Id ||
                    assignment.StaffMembers.Any(staff => staff.StaffMemberId == member.Id)).ToList();

                return new TeamReportRow(
                    member.Id,
                    $"{member.FirstName} {member.LastName}".Trim(),
                    member.RoleName,
                    jobs.Count,
                    jobs.Count(assignment => assignment.Job.Status == "Completed"));
            })
            .OrderByDescending(row => row.AssignedJobs)
            .ToList();

        return Ok(new TeamReportResponse(rows, unassignedJobs, "Time tracking data not available yet."));
    }

    [HttpGet("business")]
    public async Task<ActionResult<BusinessReportResponse>> GetBusiness([FromQuery] string? range = null)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        if (!await TenantHasMinimumPlanAsync(tenantId, "Business"))
        {
            return StatusCode(StatusCodes.Status402PaymentRequired, new { error = "Upgrade required" });
        }

        var dateRange = ResolveRange(range);
        var quotes = _context.Quotes
            .AsNoTracking()
            .Where(quote =>
                quote.TenantId == tenantId &&
                quote.CreatedAt >= dateRange.FromUtc &&
                quote.CreatedAt < dateRange.ToUtc);
        var invoices = _context.Invoices
            .AsNoTracking()
            .Where(invoice =>
                invoice.TenantId == tenantId &&
                invoice.CreatedAt >= dateRange.FromUtc &&
                invoice.CreatedAt < dateRange.ToUtc);

        var quoteCount = await quotes.CountAsync();
        var acceptedQuotes = await quotes.CountAsync(quote => quote.Status == "Accepted");
        var quoteTotal = await quotes.SumAsync(quote => (decimal?)quote.Total) ?? 0m;
        var acceptedQuoteTotal = await quotes.Where(quote => quote.Status == "Accepted").SumAsync(quote => (decimal?)quote.Total) ?? 0m;
        var invoiceTotalPence = await invoices.SumAsync(invoice => (int?)invoice.TotalPence) ?? 0;
        var paidInvoiceTotalPence = await invoices.Where(invoice => invoice.Status == "Paid").SumAsync(invoice => (int?)invoice.TotalPence) ?? 0;

        return Ok(new BusinessReportResponse(
            quoteCount,
            acceptedQuotes,
            quoteCount == 0 ? 0 : Math.Round((decimal)acceptedQuotes / quoteCount * 100, 1),
            quoteTotal,
            acceptedQuoteTotal,
            invoiceTotalPence,
            paidInvoiceTotalPence,
            invoiceTotalPence - paidInvoiceTotalPence));
    }

    private async Task<bool> TenantHasMinimumPlanAsync(int tenantId, string minimumPlan)
    {
        var planName = await _context.Subscriptions
            .AsNoTracking()
            .Include(subscription => subscription.Plan)
            .Where(subscription => subscription.TenantId == tenantId)
            .Select(subscription => subscription.Plan == null ? null : subscription.Plan.Name)
            .FirstOrDefaultAsync();

        return PlanRank(planName) >= PlanRank(minimumPlan);
    }

    private static int PlanRank(string? planName)
    {
        return planName?.Trim().ToLowerInvariant() switch
        {
            "enterprise" => 3,
            "business" => 2,
            "team" => 1,
            "solo" or "trial" => 0,
            _ => -1
        };
    }

    private static DateRange ResolveRange(string? range)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;

        return range?.Trim().ToLowerInvariant() switch
        {
            "last-month" => new DateRange(
                new DateTime(today.Year, today.Month, 1).AddMonths(-1),
                new DateTime(today.Year, today.Month, 1)),
            "last-30-days" => new DateRange(today.AddDays(-30), today.AddDays(1)),
            "last-90-days" => new DateRange(today.AddDays(-90), today.AddDays(1)),
            "year-to-date" => new DateRange(new DateTime(today.Year, 1, 1), today.AddDays(1)),
            _ => new DateRange(new DateTime(today.Year, today.Month, 1), new DateTime(today.Year, today.Month, 1).AddMonths(1))
        };
    }
}

public sealed record ReportsSummaryResponse(
    DateTime FromUtc,
    DateTime ToUtc,
    int JobsCompleted,
    int JobsCompletedPreviousPeriod,
    int JobsScheduled,
    int OpenJobs,
    int OverdueJobs,
    decimal AverageCompletedPerWeek,
    decimal AverageCompletedPerMonth,
    decimal CompletionRatePercent);

public sealed record JobReportRow(string Status, int Count);

public sealed record TeamReportResponse(
    IReadOnlyList<TeamReportRow> Rows,
    int UnassignedJobs,
    string TimeTrackingMessage);

public sealed record TeamReportRow(
    int StaffMemberId,
    string Name,
    string RoleName,
    int AssignedJobs,
    int CompletedJobs);

public sealed record BusinessReportResponse(
    int QuoteCount,
    int AcceptedQuoteCount,
    decimal QuoteConversionRatePercent,
    decimal QuoteTotal,
    decimal AcceptedQuoteTotal,
    int InvoiceTotalPence,
    int PaidInvoiceTotalPence,
    int UnpaidInvoiceTotalPence);

internal sealed record DateRange(DateTime FromUtc, DateTime ToUtc);
