using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Jobs;
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

    public async Task<Job> CreateAsync(CreateJobRequest request, int tenantId)
    {
        await EnsureCustomerBelongsToTenantAsync(request.CustomerId, tenantId);
        await EnsureEngineerBelongsToTenantAsync(request.EngineerId, tenantId);

        var job = new Job
        {
            TenantId = tenantId,
            Customer = CleanRequired(request.Customer, "Customer"),
            Phone = CleanRequired(request.Phone, "Phone number"),
            JobTitle = CleanRequired(request.JobTitle, "Job title"),
            Address = CleanRequired(request.Address, "Address"),
            ScheduledDate = request.ScheduledDate,
            Status = Canonicalise(request.Status ?? "Scheduled", AllowedStatuses),
            Priority = Canonicalise(request.Priority ?? "Normal", AllowedPriorities),
            Notes = CleanOptional(request.Notes),
            EngineerId = request.EngineerId,
            QuoteId = null
        };

        ValidateJob(job);

        await _context.Jobs.AddAsync(job);
        await _context.SaveChangesAsync();

        return job;
    }

    public async Task<Job?> UpdateAsync(int id, UpdateJobRequest request, int tenantId)
    {
        var job = await _context.Jobs
            .FirstOrDefaultAsync(existingJob =>
                existingJob.Id == id &&
                existingJob.TenantId == tenantId);

        if (job is null)
        {
            return null;
        }

        await EnsureCustomerBelongsToTenantAsync(request.CustomerId, tenantId);
        await EnsureEngineerBelongsToTenantAsync(request.EngineerId, tenantId);

        if (request.Customer is not null)
        {
            job.Customer = CleanRequired(request.Customer, "Customer");
        }

        if (request.Phone is not null)
        {
            job.Phone = CleanRequired(request.Phone, "Phone number");
        }

        if (request.JobTitle is not null)
        {
            job.JobTitle = CleanRequired(request.JobTitle, "Job title");
        }

        if (request.Address is not null)
        {
            job.Address = CleanRequired(request.Address, "Address");
        }

        if (request.ScheduledDate.HasValue)
        {
            job.ScheduledDate = request.ScheduledDate.Value;
        }

        if (request.Status is not null)
        {
            job.Status = Canonicalise(request.Status, AllowedStatuses);
        }

        if (request.Priority is not null)
        {
            job.Priority = Canonicalise(request.Priority, AllowedPriorities);
        }

        job.Notes = CleanOptional(request.Notes);
        job.EngineerId = request.EngineerId;

        ValidateJob(job);

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

    private async Task EnsureCustomerBelongsToTenantAsync(int? customerId, int tenantId)
    {
        if (customerId is null)
        {
            return;
        }

        var customerExists = await _context.Customers
            .AsNoTracking()
            .AnyAsync(customer =>
                customer.Id == customerId &&
                customer.TenantId == tenantId);

        if (!customerExists)
        {
            throw new ValidationException("Customer was not found.");
        }
    }

    private static void ValidateJob(Job job)
    {
        if (job.ScheduledDate.Year < 2024 || job.ScheduledDate.Year > 2099)
        {
            throw new ValidationException("Scheduled date must be between 2024 and 2099.");
        }

        if (job.ScheduledDate.Date < DateTime.Today)
        {
            throw new ValidationException("Scheduled date cannot be in the past.");
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

    private static string CleanRequired(string value, string label)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ValidationException($"{label} is required.");
        }

        return value.Trim();
    }

    private static string? CleanOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
