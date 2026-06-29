using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;

namespace TradeLike.Api.Controllers;

[ApiController]
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
        var engineers = await _context.Engineers
            .AsNoTracking()
            .OrderBy(e => e.Name)
            .ToListAsync();

        return Ok(engineers);
    }

    // 🔥 NEW: workload per engineer for a week
    [HttpGet("workload")]
    public async Task<IActionResult> GetWorkload(DateTime weekStart)
    {
        var weekEnd = weekStart.AddDays(7);

        var jobs = await _context.Jobs
            .AsNoTracking()
            .Where(j =>
                j.ScheduledDate >= weekStart &&
                j.ScheduledDate < weekEnd &&
                j.EngineerId != null)
            .ToListAsync();

        var workload = jobs
            .GroupBy(j => new { j.EngineerId, Day = j.ScheduledDate.Date })
            .Select(g => new
            {
                engineerId = g.Key.EngineerId,
                date = g.Key.Day,
                jobCount = g.Count()
            });

        return Ok(workload);
    }
}