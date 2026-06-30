using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Models;
using TradeLike.Api.Services;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class JobsController : ControllerBase
{
    private readonly IJobService _jobService;

    public JobsController(IJobService jobService)
    {
        _jobService = jobService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<JobResponse>>> GetJobs()
    {
        var jobs = await _jobService.GetAllAsync();

        return Ok(jobs.Select(ToResponse).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<JobResponse>> GetJob(int id)
    {
        var job = await _jobService.GetByIdAsync(id);

        if (job is null)
        {
            return NotFound();
        }

        return Ok(ToResponse(job));
    }

    [HttpPost]
    public async Task<ActionResult<JobResponse>> CreateJob([FromBody] Job job)
    {
        try
        {
            var created = await _jobService.CreateAsync(job);
            var response = ToResponse(created);

            return CreatedAtAction(
                nameof(GetJob),
                new { id = response.Id },
                response);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<JobResponse>> UpdateJob(int id, [FromBody] Job job)
    {
        try
        {
            var updated = await _jobService.UpdateAsync(id, job);

            if (updated is null)
            {
                return NotFound();
            }

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
        var deleted = await _jobService.DeleteAsync(id);

        if (deleted is null)
        {
            return NotFound();
        }

        return Ok(ToResponse(deleted));
    }

    [HttpGet("today")]
    public async Task<ActionResult<IReadOnlyList<JobResponse>>> GetTodayJobs()
    {
        var jobs = await _jobService.GetTodayAsync();

        return Ok(jobs.Select(ToResponse).ToList());
    }

    [HttpGet("week")]
    public async Task<ActionResult<IReadOnlyList<JobResponse>>> GetWeekJobs(
        [FromQuery] DateTime? start)
    {
        var weekStart = start?.Date ?? DateTime.Today;
        var jobs = await _jobService.GetWeekAsync(weekStart);

        return Ok(jobs.Select(ToResponse).ToList());
    }

    private static JobResponse ToResponse(Job job)
    {
        return new JobResponse
        {
            Id = job.Id,
            Customer = job.Customer,
            Phone = job.Phone,
            JobTitle = job.JobTitle,
            Address = job.Address,
            ScheduledDate = job.ScheduledDate,
            Status = job.Status,
            Priority = job.Priority,
            Notes = job.Notes,
            QuoteId = job.QuoteId,
            EngineerId = job.EngineerId
        };
    }
}

public sealed class JobResponse
{
    public int Id { get; init; }

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
}