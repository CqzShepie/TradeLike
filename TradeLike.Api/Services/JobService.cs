using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public class JobService : IJobService
{
    private readonly TradeLikeDbContext _context;

    public JobService(TradeLikeDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Job>> GetAllAsync()
    {
        return await _context.Jobs
            .AsNoTracking()
            .OrderByDescending(j => j.ScheduledDate)
            .ToListAsync();
    }

    public async Task<Job?> GetByIdAsync(int id)
    {
        return await _context.Jobs
            .AsNoTracking()
            .FirstOrDefaultAsync(j => j.Id == id);
    }

    public async Task<Job> CreateAsync(Job job)
    {
        ValidateJob(job);

        await _context.Jobs.AddAsync(job);
        await _context.SaveChangesAsync();

        return job;
    }

    public async Task<Job?> UpdateAsync(int id, Job updatedJob)
    {
        ValidateJob(updatedJob);

        var job = await _context.Jobs.FindAsync(id);

        if (job is null)
            return null;

        job.Customer = updatedJob.Customer;
        job.Phone = updatedJob.Phone;
        job.JobTitle = updatedJob.JobTitle;
        job.Address = updatedJob.Address;
        job.ScheduledDate = updatedJob.ScheduledDate;
        job.Status = updatedJob.Status;
        job.Priority = updatedJob.Priority;

        await _context.SaveChangesAsync();

        return job;
    }

    public async Task<Job?> DeleteAsync(int id)
    {
        var job = await _context.Jobs.FindAsync(id);

        if (job is null)
            return null;

        _context.Jobs.Remove(job);
        await _context.SaveChangesAsync();

        return job;
    }

    public async Task<IReadOnlyList<Job>> GetTodayAsync()
    {
        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        return await _context.Jobs
            .AsNoTracking()
            .Where(j => j.ScheduledDate >= today &&
                        j.ScheduledDate < tomorrow)
            .OrderBy(j => j.ScheduledDate)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Job>> GetWeekAsync()
    {
        var start = DateTime.Today;
        var end = start.AddDays(7);

        return await _context.Jobs
            .AsNoTracking()
            .Where(j => j.ScheduledDate >= start &&
                        j.ScheduledDate < end)
            .OrderBy(j => j.ScheduledDate)
            .ToListAsync();
    }

    private static void ValidateJob(Job job)
    {
        if (job.ScheduledDate.Year < 2024 || job.ScheduledDate.Year > 2099)
            throw new ValidationException(
                "Scheduled date must be between 2024 and 2099.");

        if (string.IsNullOrWhiteSpace(job.Customer))
            throw new ValidationException("Customer is required.");

        if (string.IsNullOrWhiteSpace(job.Phone))
            throw new ValidationException("Phone number is required.");

        if (string.IsNullOrWhiteSpace(job.JobTitle))
            throw new ValidationException("Job title is required.");

        if (string.IsNullOrWhiteSpace(job.Address))
            throw new ValidationException("Address is required.");
    }
}