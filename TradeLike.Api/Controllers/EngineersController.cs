using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Security;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireCustomerRole")]          // ← changed (was RequireStaffRole)
[Route("api/[controller]")]
public class EngineersController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public EngineersController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);

        var engineers = await _context.Engineers
            .AsNoTracking()
            .Where(e => e.TenantId == tenantId)
            .OrderBy(e => e.Name)
            .ToListAsync();

        return Ok(engineers);
    }

    /// <summary>
    /// Returns scheduled-job counts for each engineer for the given week.
    /// </summary>
    [HttpGet("workload")]
    public async Task<IActionResult> GetWorkload(DateTime weekStart)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var weekEnd = weekStart.AddDays(7);

        var jobs = await _context.Jobs
            .AsNoTracking()
            .Where(j =>
                j.TenantId == tenantId &&
                j.ScheduledDate >= weekStart &&
                j.ScheduledDate <  weekEnd)
            .GroupBy(j => j.EngineerId)
            .Select(g => new
            {
                EngineerId = g.Key,
                JobCount   = g.Count()
            })
            .ToListAsync();

        return Ok(jobs);
    }
}
