using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Models;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class JobsController : ControllerBase
{
    private static List<Job> Jobs = new()
    {
        new Job
        {
            Id = 1,
            Customer = "John Williams",
            JobTitle = "Boiler Service",
            Address = "London",
            Time = "08:30",
            Status = "Scheduled"
        },
        new Job
        {
            Id = 2,
            Customer = "Sarah Smith",
            JobTitle = "Radiator Repair",
            Address = "Manchester",
            Time = "10:00",
            Status = "In Progress"
        }
    };

    // GET
    [HttpGet]
    public IActionResult GetJobs()
    {
        return Ok(Jobs);
    }

    // POST
    [HttpPost]
    public IActionResult CreateJob([FromBody] Job job)
    {
        job.Id = Jobs.Count + 1;
        Jobs.Add(job);

        return Ok(job);
    }

    // DELETE
    [HttpDelete("{id}")]
    public IActionResult DeleteJob(int id)
    {
        var job = Jobs.FirstOrDefault(x => x.Id == id);

        if (job == null)
            return NotFound();

        Jobs.Remove(job);

        return Ok(job);
    }

    // PUT (UPDATE)
    [HttpPut("{id}")]
    public IActionResult UpdateJob(int id, [FromBody] Job updatedJob)
    {
        var job = Jobs.FirstOrDefault(x => x.Id == id);

        if (job == null)
            return NotFound();

        job.Customer = updatedJob.Customer;
        job.JobTitle = updatedJob.JobTitle;
        job.Address = updatedJob.Address;
        job.Time = updatedJob.Time;
        job.Status = updatedJob.Status;

        return Ok(job);
    }
}