using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Models;
using TradeLike.Api.Services;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IJobService _jobService;

    public DashboardController(IJobService jobService)
    {
        _jobService = jobService;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var jobs = await _jobService.GetAllAsync();

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
            .OrderByDescending(job => GetActivityDate(job))
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

    private static DateTime GetActivityDate(Job job)
    {
        return job.ScheduledDate;
    }

    private static DashboardActivityResponse ToActivity(Job job)
    {
        var title = job.Status switch
        {
            "Completed" => "Job completed",
            "InProgress" => "Job in progress",
            "Cancelled" => "Job cancelled",
            _ => "Job scheduled"
        };

        var description = $"{job.JobTitle} for {job.Customer}";

        return new DashboardActivityResponse(
            JobId: job.Id,
            Title: title,
            Description: description,
            Timestamp: job.ScheduledDate,
            Type: job.Status
        );
    }

    private sealed record DashboardSummaryResponse(
        int TotalJobs,
        int ScheduledJobs,
        int InProgressJobs,
        int CompletedJobs,
        IReadOnlyList<Job> TodayJobs,
        IReadOnlyList<Job> UpcomingJobs,
        IReadOnlyList<DashboardActivityResponse> RecentActivity
    );

    private sealed record DashboardActivityResponse(
        int JobId,
        string Title,
        string Description,
        DateTime Timestamp,
        string Type
    );
}