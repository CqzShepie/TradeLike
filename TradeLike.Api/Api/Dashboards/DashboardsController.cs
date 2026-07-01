using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Dashboards;

[ApiController]
[Authorize(Policy = "RequireManagerRole")]
[Route("api/dashboards")]
public sealed class DashboardsController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly TradeLikeDbContext _context;

    public DashboardsController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        if (!await DashboardsAllowed(cancellationToken))
        {
            return UpgradeRequired();
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var dashboards = await _context.Dashboards
            .AsNoTracking()
            .Where(dashboard => dashboard.TenantId == tenantId)
            .OrderByDescending(dashboard => dashboard.CreatedAtUtc)
            .Select(dashboard => new DashboardSummaryResponse(
                dashboard.Id,
                dashboard.Name,
                dashboard.LayoutJson,
                dashboard.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(dashboards);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateDashboardRequest request, CancellationToken cancellationToken)
    {
        if (!await DashboardsAllowed(cancellationToken))
        {
            return UpgradeRequired();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { error = "Dashboard name is required." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var dashboard = new Dashboard
        {
            TenantId = tenantId,
            Name = request.Name.Trim(),
            LayoutJson = request.LayoutJson,
            CreatedById = CurrentUserId(),
            CreatedAtUtc = DateTime.UtcNow,
            Widgets = request.Widgets.Select(ToWidget).ToList()
        };

        _context.Dashboards.Add(dashboard);
        await _context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(Get), new { id = dashboard.Id }, ToDetail(dashboard));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken cancellationToken)
    {
        if (!await DashboardsAllowed(cancellationToken))
        {
            return UpgradeRequired();
        }

        var dashboard = await LoadDashboard(id, cancellationToken);
        return dashboard is null ? NotFound() : Ok(ToDetail(dashboard));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateDashboardRequest request, CancellationToken cancellationToken)
    {
        if (!await DashboardsAllowed(cancellationToken))
        {
            return UpgradeRequired();
        }

        var dashboard = await LoadDashboard(id, cancellationToken);
        if (dashboard is null)
        {
            return NotFound();
        }

        dashboard.Name = request.Name.Trim();
        dashboard.LayoutJson = request.LayoutJson;
        dashboard.Widgets.Clear();
        foreach (var widget in request.Widgets.Select(ToWidget))
        {
            dashboard.Widgets.Add(widget);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(ToDetail(dashboard));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        if (!await DashboardsAllowed(cancellationToken))
        {
            return UpgradeRequired();
        }

        var dashboard = await LoadDashboard(id, cancellationToken);
        if (dashboard is null)
        {
            return NotFound();
        }

        _context.Dashboards.Remove(dashboard);
        await _context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:int}/run")]
    public async Task<IActionResult> Run(int id, CancellationToken cancellationToken)
    {
        if (!await DashboardsAllowed(cancellationToken))
        {
            return UpgradeRequired();
        }

        var dashboard = await LoadDashboard(id, cancellationToken);
        if (dashboard is null)
        {
            return NotFound();
        }

        var results = new List<DashboardWidgetRunResponse>();
        foreach (var widget in dashboard.Widgets)
        {
            results.Add(new DashboardWidgetRunResponse(widget.Id, widget.Type.ToString(), await RunWidget(widget, cancellationToken)));
        }

        return Ok(results);
    }

    private async Task<object> RunWidget(DashboardWidget widget, CancellationToken cancellationToken)
    {
        var query = ParseQuery(widget.QueryJson);
        var metric = query.TryGetValue("metric", out var metricValue) ? metricValue : string.Empty;
        var tenantId = TenantHelpers.GetTenantId(HttpContext);

        if (widget.Type == DashboardWidgetType.KPI && string.Equals(metric, "revenue", StringComparison.OrdinalIgnoreCase))
        {
            var totalPence = await _context.Invoices
                .AsNoTracking()
                .Where(invoice => invoice.TenantId == tenantId && invoice.Status == "Paid")
                .SumAsync(invoice => (int?)invoice.TotalPence, cancellationToken) ?? 0;

            return new { label = "Revenue", value = totalPence / 100m, currency = "GBP" };
        }

        if (string.Equals(metric, "jobStatus", StringComparison.OrdinalIgnoreCase))
        {
            var rows = await _context.Jobs
                .AsNoTracking()
                .Where(job => job.TenantId == tenantId)
                .GroupBy(job => job.Status)
                .Select(group => new { label = group.Key, value = group.Count() })
                .ToListAsync(cancellationToken);

            return rows;
        }

        return Array.Empty<object>();
    }

    private async Task<Dashboard?> LoadDashboard(int id, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        return await _context.Dashboards
            .Include(dashboard => dashboard.Widgets)
            .FirstOrDefaultAsync(dashboard => dashboard.Id == id && dashboard.TenantId == tenantId, cancellationToken);
    }

    private async Task<bool> DashboardsAllowed(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var subscription = await _context.Subscriptions
            .AsNoTracking()
            .Include(item => item.Plan)
            .FirstOrDefaultAsync(item => item.TenantId == tenantId, cancellationToken);

        return subscription?.Plan?.Name.Trim().ToLowerInvariant() is "business" or "enterprise";
    }

    private int CurrentUserId()
    {
        return int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) ? userId : 0;
    }

    private static DashboardWidget ToWidget(DashboardWidgetRequest request)
    {
        return new DashboardWidget
        {
            Type = Enum.TryParse<DashboardWidgetType>(request.Type, ignoreCase: true, out var type)
                ? type
                : DashboardWidgetType.KPI,
            QueryJson = request.QueryJson,
            PositionJson = request.PositionJson
        };
    }

    private static DashboardDetailResponse ToDetail(Dashboard dashboard)
    {
        return new DashboardDetailResponse(
            dashboard.Id,
            dashboard.Name,
            dashboard.LayoutJson,
            dashboard.CreatedById,
            dashboard.CreatedAtUtc,
            dashboard.Widgets
                .OrderBy(widget => widget.Id)
                .Select(widget => new DashboardWidgetResponse(
                    widget.Id,
                    widget.Type.ToString(),
                    widget.QueryJson,
                    widget.PositionJson))
                .ToList());
    }

    private static Dictionary<string, string> ParseQuery(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json, JsonOptions) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static ObjectResult UpgradeRequired()
    {
        return new ObjectResult(new { error = "Upgrade required" })
        {
            StatusCode = StatusCodes.Status402PaymentRequired
        };
    }
}

public sealed record CreateDashboardRequest(
    string Name,
    string LayoutJson,
    IReadOnlyList<DashboardWidgetRequest> Widgets);

public sealed record UpdateDashboardRequest(
    string Name,
    string LayoutJson,
    IReadOnlyList<DashboardWidgetRequest> Widgets);

public sealed record DashboardWidgetRequest(
    string Type,
    string QueryJson,
    string PositionJson);

public sealed record DashboardSummaryResponse(
    int Id,
    string Name,
    string LayoutJson,
    DateTime CreatedAtUtc);

public sealed record DashboardDetailResponse(
    int Id,
    string Name,
    string LayoutJson,
    int CreatedById,
    DateTime CreatedAtUtc,
    IReadOnlyList<DashboardWidgetResponse> Widgets);

public sealed record DashboardWidgetResponse(
    int Id,
    string Type,
    string QueryJson,
    string PositionJson);

public sealed record DashboardWidgetRunResponse(
    int WidgetId,
    string Type,
    object Data);
