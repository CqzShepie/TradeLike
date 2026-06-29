using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public DashboardController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var jobs = await _context.Jobs
            .AsNoTracking()
            .Select(job => new DashboardJobResponse(
                job.Id,
                job.Customer,
                job.Phone,
                job.JobTitle,
                job.Address,
                job.ScheduledDate,
                job.Status,
                job.Priority
            ))
            .ToListAsync();

        var today = DateTime.Today;

        var todayJobs = jobs
            .Where(job => job.ScheduledDate.Date == today)
            .OrderBy(job => job.ScheduledDate)
            .ToList();

        var upcomingJobs = jobs
            .Where(job => job.ScheduledDate.Date > today)
            .OrderBy(job => job.ScheduledDate)
            .Take(5)
            .ToList();

        var recentActivity = jobs
            .OrderByDescending(job => job.ScheduledDate)
            .Take(8)
            .Select(ToActivity)
            .ToList();

        var response = new DashboardSummaryResponse(
            TotalJobs: jobs.Count,
            ScheduledJobs: jobs.Count(job => job.Status == "Scheduled"),
            InProgressJobs: jobs.Count(job => job.Status == "InProgress"),
            CompletedJobs: jobs.Count(job => job.Status == "Completed"),
            TodayJobs: todayJobs,
            UpcomingJobs: upcomingJobs,
            RecentActivity: recentActivity
        );

        return Ok(response);
    }

    private static DashboardActivityResponse ToActivity(DashboardJobResponse job)
    {
        var title = job.Status switch
        {
            "Completed" => "Job completed",
            "InProgress" => "Job in progress",
            "Cancelled" => "Job cancelled",
            _ => "Job scheduled"
        };

        return new DashboardActivityResponse(
            JobId: job.Id,
            Title: title,
            Description: $"{job.JobTitle} for {job.Customer}",
            Timestamp: job.ScheduledDate,
            Type: job.Status
        );
    }

    private sealed record DashboardSummaryResponse(
        int TotalJobs,
        int ScheduledJobs,
        int InProgressJobs,
        int CompletedJobs,
        IReadOnlyList<DashboardJobResponse> TodayJobs,
        IReadOnlyList<DashboardJobResponse> UpcomingJobs,
        IReadOnlyList<DashboardActivityResponse> RecentActivity
    );

    private sealed record DashboardJobResponse(
        int Id,
        string Customer,
        string Phone,
        string JobTitle,
        string Address,
        DateTime ScheduledDate,
        string Status,
        string Priority
    );

    private sealed record DashboardActivityResponse(
        int JobId,
        string Title,
        string Description,
        DateTime Timestamp,
        string Type
    );
}