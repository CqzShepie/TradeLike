using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public class JobService : IJobService
{
    private static readonly string[] AllowedStatuses =
    {
        "Scheduled",
        "InProgress",
        "Completed",
        "Cancelled"
    };

    private static readonly string[] AllowedPriorities =
    {
        "Low",
        "Normal",
        "High",
        "Urgent"
    };

    private readonly TradeLikeDbContext _context;

    public JobService(TradeLikeDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Job>> GetAllAsync(int tenantId)
    {
        return await _context.Jobs
            .AsNoTracking()
            .Include(job => job.Quote)
                .ThenInclude(quote => quote!.LineItems)
            .Where(job => job.TenantId == tenantId)
            .OrderBy(job => job.ScheduledDate)
            .ToListAsync();
    }

    public async Task<Job?> GetByIdAsync(int id, int tenantId)
    {
        return await _context.Jobs
            .AsNoTracking()
            .Include(job => job.Quote)
                .ThenInclude(quote => quote!.LineItems)
            .FirstOrDefaultAsync(job => job.Id == id && job.TenantId == tenantId);
    }

    public async Task<Job> CreateAsync(Job job, int tenantId)
    {
        NormaliseJob(job);
        ValidateJob(job);
        await EnsureEngineerBelongsToTenantAsync(job.EngineerId, tenantId);

        job.TenantId = tenantId;
        job.QuoteId = null;

        await _context.Jobs.AddAsync(job);
        await _context.SaveChangesAsync();

        return job;
    }

    public async Task<Job?> UpdateAsync(int id, Job updatedJob, int tenantId)
    {
        NormaliseJob(updatedJob);
        ValidateJob(updatedJob);
        await EnsureEngineerBelongsToTenantAsync(updatedJob.EngineerId, tenantId);

        var job = await _context.Jobs
            .FirstOrDefaultAsync(existingJob =>
                existingJob.Id == id &&
                existingJob.TenantId == tenantId);

        if (job is null)
        {
            return null;
        }

        job.Customer = updatedJob.Customer;
        job.Phone = updatedJob.Phone;
        job.JobTitle = updatedJob.JobTitle;
        job.Address = updatedJob.Address;
        job.ScheduledDate = updatedJob.ScheduledDate;
        job.Status = updatedJob.Status;
        job.Priority = updatedJob.Priority;
        job.Notes = updatedJob.Notes;
        job.EngineerId = updatedJob.EngineerId;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id, tenantId);
    }

    public async Task<Job?> DeleteAsync(int id, int tenantId)
    {
        var job = await _context.Jobs
            .FirstOrDefaultAsync(existingJob =>
                existingJob.Id == id &&
                existingJob.TenantId == tenantId);

        if (job is null)
        {
            return null;
        }

        _context.Jobs.Remove(job);
        await _context.SaveChangesAsync();

        return job;
    }

    public async Task<IReadOnlyList<Job>> GetTodayAsync(int tenantId)
    {
        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        return await _context.Jobs
            .AsNoTracking()
            .Include(job => job.Quote)
                .ThenInclude(quote => quote!.LineItems)
            .Where(job =>
                job.TenantId == tenantId &&
                job.ScheduledDate >= today &&
                job.ScheduledDate < tomorrow)
            .OrderBy(job => job.ScheduledDate)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Job>> GetWeekAsync(DateTime weekStart, int tenantId)
    {
        weekStart = weekStart.Date;

        var start = weekStart.DayOfWeek switch
        {
            DayOfWeek.Sunday => weekStart.AddDays(-6),
            _ => weekStart.AddDays(1 - (int)weekStart.DayOfWeek)
        };

        var end = start.AddDays(7);

        return await _context.Jobs
            .AsNoTracking()
            .Include(job => job.Quote)
                .ThenInclude(quote => quote!.LineItems)
            .Where(job =>
                job.TenantId == tenantId &&
                job.ScheduledDate >= start &&
                job.ScheduledDate < end)
            .OrderBy(job => job.ScheduledDate)
            .ToListAsync();
    }

    public async Task<Job?> LinkQuoteAsync(int jobId, int quoteId, int tenantId)
    {
        if (quoteId <= 0)
        {
            throw new ValidationException("Enter a valid quote number.");
        }

        var job = await _context.Jobs
            .FirstOrDefaultAsync(existingJob =>
                existingJob.Id == jobId &&
                existingJob.TenantId == tenantId);

        if (job is null)
        {
            return null;
        }

        var quoteExists = await _context.Quotes
            .AsNoTracking()
            .AnyAsync(quote =>
                quote.Id == quoteId &&
                quote.TenantId == tenantId);

        if (!quoteExists)
        {
            throw new ValidationException($"Quote #{quoteId} was not found.");
        }

        var existingLinkedJob = await _context.Jobs
            .AsNoTracking()
            .FirstOrDefaultAsync(existingJob =>
                existingJob.TenantId == tenantId &&
                existingJob.QuoteId == quoteId &&
                existingJob.Id != jobId);

        if (existingLinkedJob is not null)
        {
            throw new ValidationException(
                $"Quote #{quoteId} is already linked to Job #{existingLinkedJob.Id}.");
        }

        job.QuoteId = quoteId;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(jobId, tenantId);
    }

    public async Task<Job?> UnlinkQuoteAsync(int jobId, int tenantId)
    {
        var job = await _context.Jobs
            .FirstOrDefaultAsync(existingJob =>
                existingJob.Id == jobId &&
                existingJob.TenantId == tenantId);

        if (job is null)
        {
            return null;
        }

        job.QuoteId = null;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(jobId, tenantId);
    }

    private async Task EnsureEngineerBelongsToTenantAsync(int? engineerId, int tenantId)
    {
        if (engineerId is null)
        {
            return;
        }

        var engineerExists = await _context.Engineers
            .AsNoTracking()
            .AnyAsync(engineer =>
                engineer.Id == engineerId &&
                engineer.TenantId == tenantId);

        if (!engineerExists)
        {
            throw new ValidationException("Engineer was not found.");
        }
    }

    private static void NormaliseJob(Job job)
    {
        job.Customer = job.Customer.Trim();
        job.Phone = job.Phone.Trim();
        job.JobTitle = job.JobTitle.Trim();
        job.Address = job.Address.Trim();
        job.Status = Canonicalise(job.Status, AllowedStatuses);
        job.Priority = Canonicalise(job.Priority, AllowedPriorities);

        job.Notes = string.IsNullOrWhiteSpace(job.Notes)
            ? null
            : job.Notes.Trim();
    }

    private static void ValidateJob(Job job)
    {
        if (job.ScheduledDate.Year < 2024 || job.ScheduledDate.Year > 2099)
        {
            throw new ValidationException("Scheduled date must be between 2024 and 2099.");
        }

        if (string.IsNullOrWhiteSpace(job.Customer))
        {
            throw new ValidationException("Customer is required.");
        }

        if (string.IsNullOrWhiteSpace(job.Phone))
        {
            throw new ValidationException("Phone number is required.");
        }

        if (string.IsNullOrWhiteSpace(job.JobTitle))
        {
            throw new ValidationException("Job title is required.");
        }

        if (string.IsNullOrWhiteSpace(job.Address))
        {
            throw new ValidationException("Address is required.");
        }

        if (!AllowedStatuses.Contains(job.Status, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException(
                "Job status is invalid. Use Scheduled, InProgress, Completed, or Cancelled.");
        }

        if (!AllowedPriorities.Contains(job.Priority, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException(
                "Job priority is invalid. Use Low, Normal, High, or Urgent.");
        }

        if (!string.IsNullOrWhiteSpace(job.Notes) && job.Notes.Length > 4000)
        {
            throw new ValidationException("Job notes must be 4000 characters or fewer.");
        }
    }

    private static string Canonicalise(string value, IReadOnlyCollection<string> allowedValues)
    {
        var trimmed = value.Trim();

        return allowedValues.FirstOrDefault(
            allowed => string.Equals(allowed, trimmed, StringComparison.OrdinalIgnoreCase))
            ?? trimmed;
    }
}
