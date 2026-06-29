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

    // GET ALL
    [HttpGet]
    public async Task<IActionResult> GetJobs()
    {
        var jobs = await _jobService.GetAllAsync();
        return Ok(jobs);
    }

    // GET BY ID
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetJob(int id)
    {
        var job = await _jobService.GetByIdAsync(id);

        if (job is null)
            return NotFound();

        return Ok(job);
    }

    // CREATE
    [HttpPost]
    public async Task<IActionResult> CreateJob([FromBody] Job job)
    {
        try
        {
            var created = await _jobService.CreateAsync(job);

            return CreatedAtAction(
                nameof(GetJob),
                new { id = created.Id },
                created);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new
            {
                error = ex.Message
            });
        }
    }

    // UPDATE
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateJob(int id, [FromBody] Job job)
    {
        try
        {
            var updated = await _jobService.UpdateAsync(id, job);

            if (updated is null)
                return NotFound();

            return Ok(updated);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new
            {
                error = ex.Message
            });
        }
    }

    // DELETE
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteJob(int id)
    {
        var deleted = await _jobService.DeleteAsync(id);

        if (deleted is null)
            return NotFound();

        return Ok(deleted);
    }

    // TODAY'S JOBS
    [HttpGet("today")]
    public async Task<IActionResult> GetTodayJobs()
    {
        var jobs = await _jobService.GetTodayAsync();
        return Ok(jobs);
    }

    // WEEK VIEW (FIXED)
    [HttpGet("week")]
    public async Task<IActionResult> GetWeekJobs([FromQuery] DateTime? start)
    {
        var weekStart = start?.Date ?? DateTime.Today;

        var jobs = await _jobService.GetWeekAsync(weekStart);

        return Ok(jobs);
    }
}