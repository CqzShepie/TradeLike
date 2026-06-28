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
            Phone = "",
            JobTitle = "Boiler Service",
            Address = "London",
            Time = "08:30",
            Status = "Scheduled",
            Priority = "Normal"
        },
        new Job
        {
            Id = 2,
            Customer = "Sarah Smith",
            Phone = "",
            JobTitle = "Radiator Repair",
            Address = "Manchester",
            Time = "10:00",
            Status = "In Progress",
            Priority = "High"
        }
    };

    // GET ALL
    [HttpGet]
    public IActionResult GetJobs()
    {
        return Ok(Jobs);
    }

    // GET BY ID
    [HttpGet("{id}")]
    public IActionResult GetJob(int id)
    {
        var job = Jobs.FirstOrDefault(j => j.Id == id);

        if (job == null)
        {
            return NotFound();
        }

        return Ok(job);
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
        var job = Jobs.FirstOrDefault(j => j.Id == id);

        if (job == null)
        {
            return NotFound();
        }

        Jobs.Remove(job);

        return Ok(job);
    }

    // PUT
    [HttpPut("{id}")]
    public IActionResult UpdateJob(int id, [FromBody] Job updatedJob)
    {
        var job = Jobs.FirstOrDefault(j => j.Id == id);

        if (job == null)
        {
            return NotFound();
        }

        job.Customer = updatedJob.Customer;
        job.Phone = updatedJob.Phone;
        job.JobTitle = updatedJob.JobTitle;
        job.Address = updatedJob.Address;
        job.Time = updatedJob.Time;
        job.Status = updatedJob.Status;
        job.Priority = updatedJob.Priority;

        return Ok(job);
    }
}