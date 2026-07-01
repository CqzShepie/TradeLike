using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Usage;

[ApiController]
[Route("api/usage")]
[Authorize(Policy = "RequireDirectorRole")]
public sealed class UsageController : ControllerBase
{
    private readonly TradeLikeDbContext _db;

    public UsageController(TradeLikeDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<UsageSummaryResponse>> Get([FromQuery] int days = 30, CancellationToken cancellationToken = default)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var from = DateTime.UtcNow.Date.AddDays(-Math.Clamp(days, 1, 90) + 1);
        var rows = await _db.ApiUsageStats
            .AsNoTracking()
            .Where(stat => stat.TenantId == tenantId && stat.PeriodStartUtc >= from)
            .OrderBy(stat => stat.PeriodStartUtc)
            .ToListAsync(cancellationToken);
        var plan = User.FindFirst("plan")?.Value ?? "Solo";
        var limit = PlanRateLimits.Resolve(plan);

        return Ok(new UsageSummaryResponse
        {
            Plan = limit.Plan,
            RequestsPerSecond = limit.RequestsPerSecond,
            DailyRequestLimit = limit.DailyRequestLimit,
            Days = rows.Select(row => new UsageDayResponse
            {
                Date = row.PeriodStartUtc,
                Requests = row.Requests,
                ExportCalls = row.ExportCalls,
                AutomationRuns = row.AutomationRuns
            }).ToArray()
        });
    }

    [HttpGet("limits")]
    public ActionResult<IReadOnlyList<PlanRateLimit>> Limits()
    {
        return Ok(PlanRateLimits.ByPlan.Values.ToArray());
    }
}

public sealed class UsageSummaryResponse
{
    public string Plan { get; init; } = "Solo";

    public int RequestsPerSecond { get; init; }

    public int? DailyRequestLimit { get; init; }

    public IReadOnlyList<UsageDayResponse> Days { get; init; } = [];
}

public sealed class UsageDayResponse
{
    public DateTime Date { get; init; }

    public int Requests { get; init; }

    public int ExportCalls { get; init; }

    public int AutomationRuns { get; init; }
}
