using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Elastic;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Sync;

[ApiController]
[Route("api/sync/changes")]
[Authorize(Policy = "RequireEmployeeRole")]
public sealed class SyncController : ControllerBase
{
    private const int MaxPullChanges = 500;
    private const int MaxPushChanges = 100;

    private readonly TradeLikeDbContext _db;

    public SyncController(TradeLikeDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<SyncChangesResponse>> GetChanges(
        [FromQuery] string? since,
        [FromQuery] int take = MaxPullChanges,
        CancellationToken cancellationToken = default)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var serverTime = DateTimeOffset.UtcNow;
        var limit = Math.Clamp(take, 1, MaxPullChanges);

        var changes = await LoadSnapshotAsync(tenantId, limit, serverTime, cancellationToken);

        return Ok(new SyncChangesResponse
        {
            Cursor = CreateCursor(serverTime),
            Since = since,
            ServerTime = serverTime,
            Changes = changes,
            Tombstones = [],
            Pending = 0,
            Conflicts = []
        });
    }

    [HttpPost]
    public async Task<ActionResult<SyncPushResponse>> PushChanges(
        [FromBody] SyncPushRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var serverTime = DateTimeOffset.UtcNow;
        var applied = new List<SyncChange>();
        var conflicts = new List<SyncConflict>();

        foreach (var mutation in request.Changes.Take(MaxPushChanges))
        {
            try
            {
                var result = await ApplyMutationAsync(tenantId, mutation, serverTime, cancellationToken);

                if (result.Applied is not null)
                {
                    applied.Add(result.Applied);
                }

                if (result.Conflict is not null)
                {
                    conflicts.Add(result.Conflict);
                }
            }
            catch (ValidationException ex)
            {
                _db.ChangeTracker.Clear();
                conflicts.Add(SyncConflict.FromMutation(mutation, ex.Message));
            }
            catch (DbUpdateException)
            {
                _db.ChangeTracker.Clear();
                conflicts.Add(SyncConflict.FromMutation(
                    mutation,
                    "The offline change could not be saved. Pull the latest data and try again."));
            }
        }

        return Ok(new SyncPushResponse
        {
            Cursor = CreateCursor(serverTime),
            ServerTime = serverTime,
            Applied = applied,
            Conflicts = conflicts,
            Pending = Math.Max(0, request.Changes.Count - applied.Count - conflicts.Count)
        });
    }

    private async Task<IReadOnlyList<SyncChange>> LoadSnapshotAsync(
        int tenantId,
        int limit,
        DateTimeOffset serverTime,
        CancellationToken cancellationToken)
    {
        var changes = new List<SyncChange>();
        var remaining = limit;

        var customers = await _db.Customers
            .AsNoTracking()
            .Where(customer => customer.TenantId == tenantId)
            .OrderBy(customer => customer.Id)
            .Take(remaining)
            .ToListAsync(cancellationToken);

        changes.AddRange(customers.Select(customer => ToChange(customer, serverTime)));
        remaining -= customers.Count;

        if (remaining <= 0)
        {
            return changes;
        }

        var jobs = await _db.Jobs
            .AsNoTracking()
            .Where(job => job.TenantId == tenantId)
            .OrderByDescending(job => job.ScheduledDate)
            .Take(remaining)
            .ToListAsync(cancellationToken);

        changes.AddRange(jobs.Select(job => ToChange(job, serverTime)));
        remaining -= jobs.Count;

        if (remaining <= 0)
        {
            return changes;
        }

        var quotes = await _db.Quotes
            .AsNoTracking()
            .Include(quote => quote.LineItems)
            .Where(quote => quote.TenantId == tenantId)
            .OrderByDescending(quote => quote.CreatedAt)
            .Take(remaining)
            .ToListAsync(cancellationToken);

        changes.AddRange(quotes.Select(quote => ToChange(quote, serverTime)));

        return changes;
    }

    private async Task<SyncApplyResult> ApplyMutationAsync(
        int tenantId,
        SyncMutation mutation,
        DateTimeOffset serverTime,
        CancellationToken cancellationToken)
    {
        var type = SearchTypeFilter.Normalise(mutation.Type);
        var action = mutation.Action.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(type))
        {
            return SyncApplyResult.ConflictOnly(SyncConflict.FromMutation(mutation, "Unsupported sync entity type."));
        }

        return (type, action) switch
        {
            ("customer", "upsert") => await UpsertCustomerAsync(tenantId, mutation, serverTime, cancellationToken),
            ("customer", "delete") => await DeleteCustomerAsync(tenantId, mutation, serverTime, cancellationToken),
            ("job", "upsert") => await UpsertJobAsync(tenantId, mutation, serverTime, cancellationToken),
            ("job", "delete") => await DeleteJobAsync(tenantId, mutation, serverTime, cancellationToken),
            ("quote", "delete") => await DeleteQuoteAsync(tenantId, mutation, serverTime, cancellationToken),
            ("quote", _) => SyncApplyResult.ConflictOnly(SyncConflict.FromMutation(
                mutation,
                "Quote edits are read-only in offline sync for this phase.")),
            _ => SyncApplyResult.ConflictOnly(SyncConflict.FromMutation(mutation, "Unsupported sync action."))
        };
    }

    private async Task<SyncApplyResult> UpsertCustomerAsync(
        int tenantId,
        SyncMutation mutation,
        DateTimeOffset serverTime,
        CancellationToken cancellationToken)
    {
        Customer? customer = null;

        if (mutation.Id is not null)
        {
            customer = await _db.Customers
                .FirstOrDefaultAsync(
                    existing => existing.Id == mutation.Id && existing.TenantId == tenantId,
                    cancellationToken);
        }

        if (customer is not null && HasVersionConflict(mutation.BaseVersion, ElasticDocumentFactory.FromCustomer(customer).Version))
        {
            return SyncApplyResult.ConflictOnly(SyncConflict.FromMutation(
                mutation,
                "Customer changed on the server before this offline update arrived.",
                ToChange(customer, serverTime)));
        }

        if (customer is null)
        {
            customer = new Customer { TenantId = tenantId };
            await _db.Customers.AddAsync(customer, cancellationToken);
        }

        customer.Name = ReadRequiredString(mutation.Payload, "name", "Customer name", customer.Name);
        customer.Phone = ReadRequiredString(mutation.Payload, "phone", "Phone number", customer.Phone);
        customer.Email = ReadRequiredString(mutation.Payload, "email", "Email address", customer.Email).ToLowerInvariant();
        customer.Address = ReadRequiredString(mutation.Payload, "address", "Address", customer.Address);
        customer.Notes = ReadNullableString(mutation.Payload, "notes", customer.Notes);

        await _db.SaveChangesAsync(cancellationToken);

        return SyncApplyResult.AppliedOnly(ToChange(customer, serverTime, mutation));
    }

    private async Task<SyncApplyResult> DeleteCustomerAsync(
        int tenantId,
        SyncMutation mutation,
        DateTimeOffset serverTime,
        CancellationToken cancellationToken)
    {
        if (mutation.Id is null)
        {
            throw new ValidationException("A customer id is required for delete sync changes.");
        }

        var customer = await _db.Customers
            .FirstOrDefaultAsync(
                existing => existing.Id == mutation.Id && existing.TenantId == tenantId,
                cancellationToken);

        if (customer is null)
        {
            return SyncApplyResult.AppliedOnly(ToTombstone("customer", mutation.Id, serverTime, mutation));
        }

        if (HasVersionConflict(mutation.BaseVersion, ElasticDocumentFactory.FromCustomer(customer).Version))
        {
            return SyncApplyResult.ConflictOnly(SyncConflict.FromMutation(
                mutation,
                "Customer changed on the server before this offline delete arrived.",
                ToChange(customer, serverTime)));
        }

        _db.Customers.Remove(customer);
        await _db.SaveChangesAsync(cancellationToken);

        return SyncApplyResult.AppliedOnly(ToTombstone("customer", mutation.Id, serverTime, mutation));
    }

    private async Task<SyncApplyResult> UpsertJobAsync(
        int tenantId,
        SyncMutation mutation,
        DateTimeOffset serverTime,
        CancellationToken cancellationToken)
    {
        Job? job = null;

        if (mutation.Id is not null)
        {
            job = await _db.Jobs
                .FirstOrDefaultAsync(
                    existing => existing.Id == mutation.Id && existing.TenantId == tenantId,
                    cancellationToken);
        }

        if (job is not null && HasVersionConflict(mutation.BaseVersion, ElasticDocumentFactory.FromJob(job).Version))
        {
            return SyncApplyResult.ConflictOnly(SyncConflict.FromMutation(
                mutation,
                "Job changed on the server before this offline update arrived.",
                ToChange(job, serverTime)));
        }

        if (job is null)
        {
            job = new Job { TenantId = tenantId };
            await _db.Jobs.AddAsync(job, cancellationToken);
        }

        job.Customer = ReadRequiredString(mutation.Payload, "customer", "Customer", job.Customer);
        job.Phone = ReadRequiredString(mutation.Payload, "phone", "Phone number", job.Phone);
        job.JobTitle = ReadRequiredString(mutation.Payload, "jobTitle", "Job title", job.JobTitle);
        job.Address = ReadRequiredString(mutation.Payload, "address", "Address", job.Address);
        job.ScheduledDate = ReadDateTime(mutation.Payload, "scheduledDate", job.ScheduledDate);
        job.Status = ReadRequiredString(mutation.Payload, "status", "Status", FirstNonBlank(job.Status, "Scheduled"));
        job.Priority = ReadRequiredString(mutation.Payload, "priority", "Priority", FirstNonBlank(job.Priority, "Normal"));
        job.Notes = ReadNullableString(mutation.Payload, "notes", job.Notes);
        job.EngineerId = ReadNullableInt(mutation.Payload, "engineerId", job.EngineerId);

        ValidateJob(job);

        await _db.SaveChangesAsync(cancellationToken);

        return SyncApplyResult.AppliedOnly(ToChange(job, serverTime, mutation));
    }

    private async Task<SyncApplyResult> DeleteJobAsync(
        int tenantId,
        SyncMutation mutation,
        DateTimeOffset serverTime,
        CancellationToken cancellationToken)
    {
        if (mutation.Id is null)
        {
            throw new ValidationException("A job id is required for delete sync changes.");
        }

        var job = await _db.Jobs
            .FirstOrDefaultAsync(
                existing => existing.Id == mutation.Id && existing.TenantId == tenantId,
                cancellationToken);

        if (job is null)
        {
            return SyncApplyResult.AppliedOnly(ToTombstone("job", mutation.Id, serverTime, mutation));
        }

        if (HasVersionConflict(mutation.BaseVersion, ElasticDocumentFactory.FromJob(job).Version))
        {
            return SyncApplyResult.ConflictOnly(SyncConflict.FromMutation(
                mutation,
                "Job changed on the server before this offline delete arrived.",
                ToChange(job, serverTime)));
        }

        _db.Jobs.Remove(job);
        await _db.SaveChangesAsync(cancellationToken);

        return SyncApplyResult.AppliedOnly(ToTombstone("job", mutation.Id, serverTime, mutation));
    }

    private async Task<SyncApplyResult> DeleteQuoteAsync(
        int tenantId,
        SyncMutation mutation,
        DateTimeOffset serverTime,
        CancellationToken cancellationToken)
    {
        if (mutation.Id is null)
        {
            throw new ValidationException("A quote id is required for delete sync changes.");
        }

        var quote = await _db.Quotes
            .Include(existing => existing.LineItems)
            .FirstOrDefaultAsync(
                existing => existing.Id == mutation.Id && existing.TenantId == tenantId,
                cancellationToken);

        if (quote is null)
        {
            return SyncApplyResult.AppliedOnly(ToTombstone("quote", mutation.Id, serverTime, mutation));
        }

        if (HasVersionConflict(mutation.BaseVersion, ElasticDocumentFactory.FromQuote(quote).Version))
        {
            return SyncApplyResult.ConflictOnly(SyncConflict.FromMutation(
                mutation,
                "Quote changed on the server before this offline delete arrived.",
                ToChange(quote, serverTime)));
        }

        _db.Quotes.Remove(quote);
        await _db.SaveChangesAsync(cancellationToken);

        return SyncApplyResult.AppliedOnly(ToTombstone("quote", mutation.Id, serverTime, mutation));
    }

    private static SyncChange ToChange(Customer customer, DateTimeOffset serverTime, SyncMutation? mutation = null)
    {
        return new SyncChange
        {
            ClientChangeId = mutation?.ClientChangeId,
            Type = "customer",
            Action = "upsert",
            Id = customer.Id,
            LocalId = mutation?.LocalId,
            Version = ElasticDocumentFactory.FromCustomer(customer).Version,
            ChangedAt = serverTime,
            Payload = new
            {
                customer.Id,
                customer.Name,
                customer.Phone,
                customer.Email,
                customer.Address,
                customer.Notes
            }
        };
    }

    private static SyncChange ToChange(Job job, DateTimeOffset serverTime, SyncMutation? mutation = null)
    {
        return new SyncChange
        {
            ClientChangeId = mutation?.ClientChangeId,
            Type = "job",
            Action = "upsert",
            Id = job.Id,
            LocalId = mutation?.LocalId,
            Version = ElasticDocumentFactory.FromJob(job).Version,
            ChangedAt = serverTime,
            Payload = new
            {
                job.Id,
                job.Customer,
                job.Phone,
                job.JobTitle,
                job.Address,
                job.ScheduledDate,
                job.Status,
                job.Priority,
                job.Notes,
                job.QuoteId,
                job.EngineerId
            }
        };
    }

    private static SyncChange ToChange(Quote quote, DateTimeOffset serverTime, SyncMutation? mutation = null)
    {
        return new SyncChange
        {
            ClientChangeId = mutation?.ClientChangeId,
            Type = "quote",
            Action = "upsert",
            Id = quote.Id,
            LocalId = mutation?.LocalId,
            Version = ElasticDocumentFactory.FromQuote(quote).Version,
            ChangedAt = quote.CreatedAt == default ? serverTime : quote.CreatedAt,
            Payload = new
            {
                quote.Id,
                quote.CustomerId,
                quote.CustomerName,
                quote.Title,
                quote.Description,
                quote.Amount,
                quote.Subtotal,
                quote.VatTotal,
                quote.DiscountType,
                quote.DiscountValue,
                quote.DiscountTotal,
                quote.Total,
                quote.Status,
                quote.Notes,
                quote.CreatedAt,
                LineItems = quote.LineItems.OrderBy(item => item.Id).Select(item => new
                {
                    item.Id,
                    item.QuoteId,
                    item.Type,
                    item.Description,
                    item.Quantity,
                    item.UnitPrice,
                    item.VatRate,
                    item.LineTotal
                })
            }
        };
    }

    private static SyncChange ToTombstone(
        string type,
        int? id,
        DateTimeOffset serverTime,
        SyncMutation mutation)
    {
        return new SyncChange
        {
            ClientChangeId = mutation.ClientChangeId,
            Type = type,
            Action = "delete",
            Id = id,
            LocalId = mutation.LocalId,
            Version = Fingerprint(type, id, "deleted", serverTime.ToString("O")),
            ChangedAt = serverTime,
            Payload = new { }
        };
    }

    private static bool HasVersionConflict(string? baseVersion, string currentVersion)
    {
        return !string.IsNullOrWhiteSpace(baseVersion) &&
            !string.Equals(baseVersion, currentVersion, StringComparison.OrdinalIgnoreCase);
    }

    private static string ReadRequiredString(
        JsonElement payload,
        string propertyName,
        string label,
        string? fallback)
    {
        var value = ReadNullableString(payload, propertyName, fallback);

        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ValidationException($"{label} is required.");
        }

        return value.Trim();
    }

    private static string? ReadNullableString(JsonElement payload, string propertyName, string? fallback)
    {
        if (!payload.TryGetProperty(propertyName, out var value))
        {
            return fallback;
        }

        return value.ValueKind switch
        {
            JsonValueKind.Null => null,
            JsonValueKind.String => string.IsNullOrWhiteSpace(value.GetString()) ? null : value.GetString()!.Trim(),
            _ => value.ToString()
        };
    }

    private static int? ReadNullableInt(JsonElement payload, string propertyName, int? fallback)
    {
        if (!payload.TryGetProperty(propertyName, out var value) || value.ValueKind == JsonValueKind.Null)
        {
            return fallback;
        }

        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number))
        {
            return number;
        }

        return value.ValueKind == JsonValueKind.String &&
            int.TryParse(value.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
                ? parsed
                : fallback;
    }

    private static DateTime ReadDateTime(JsonElement payload, string propertyName, DateTime fallback)
    {
        if (!payload.TryGetProperty(propertyName, out var value))
        {
            return fallback == default ? DateTime.UtcNow : fallback;
        }

        if (value.ValueKind == JsonValueKind.String &&
            DateTime.TryParse(
                value.GetString(),
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var parsed))
        {
            return parsed;
        }

        throw new ValidationException("Scheduled date is invalid.");
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
    }

    private static string FirstNonBlank(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim() ?? string.Empty;
    }

    private static string CreateCursor(DateTimeOffset serverTime)
    {
        return serverTime.ToUnixTimeMilliseconds().ToString(CultureInfo.InvariantCulture);
    }

    private static string Fingerprint(params object?[] values)
    {
        var canonical = string.Join('\u001f', values.Select(value => value?.ToString() ?? string.Empty));
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(canonical));

        return Convert.ToHexString(hash);
    }
}

public sealed class SyncPushRequest
{
    public string? LastPulledCursor { get; init; }

    public IReadOnlyList<SyncMutation> Changes { get; init; } = [];
}

public sealed class SyncMutation
{
    public string? ClientChangeId { get; init; }

    public string Type { get; init; } = string.Empty;

    public string Action { get; init; } = string.Empty;

    public int? Id { get; init; }

    public string? LocalId { get; init; }

    public string? BaseVersion { get; init; }

    public JsonElement Payload { get; init; }
}

public sealed class SyncChangesResponse
{
    public string Cursor { get; init; } = string.Empty;

    public string? Since { get; init; }

    public DateTimeOffset ServerTime { get; init; }

    public IReadOnlyList<SyncChange> Changes { get; init; } = [];

    public IReadOnlyList<SyncChange> Tombstones { get; init; } = [];

    public int Pending { get; init; }

    public IReadOnlyList<SyncConflict> Conflicts { get; init; } = [];
}

public sealed class SyncPushResponse
{
    public string Cursor { get; init; } = string.Empty;

    public DateTimeOffset ServerTime { get; init; }

    public IReadOnlyList<SyncChange> Applied { get; init; } = [];

    public IReadOnlyList<SyncConflict> Conflicts { get; init; } = [];

    public int Pending { get; init; }
}

public sealed class SyncChange
{
    public string? ClientChangeId { get; init; }

    public string Type { get; init; } = string.Empty;

    public string Action { get; init; } = string.Empty;

    public int? Id { get; init; }

    public string? LocalId { get; init; }

    public string Version { get; init; } = string.Empty;

    public DateTimeOffset ChangedAt { get; init; }

    public object Payload { get; init; } = new { };
}

public sealed class SyncConflict
{
    public string? ClientChangeId { get; init; }

    public string Type { get; init; } = string.Empty;

    public int? Id { get; init; }

    public string? LocalId { get; init; }

    public string Reason { get; init; } = string.Empty;

    public SyncChange? ServerChange { get; init; }

    public static SyncConflict FromMutation(
        SyncMutation mutation,
        string reason,
        SyncChange? serverChange = null)
    {
        return new SyncConflict
        {
            ClientChangeId = mutation.ClientChangeId,
            Type = mutation.Type,
            Id = mutation.Id,
            LocalId = mutation.LocalId,
            Reason = reason,
            ServerChange = serverChange
        };
    }
}

public sealed record SyncApplyResult(SyncChange? Applied, SyncConflict? Conflict)
{
    public static SyncApplyResult AppliedOnly(SyncChange change)
    {
        return new SyncApplyResult(change, null);
    }

    public static SyncApplyResult ConflictOnly(SyncConflict conflict)
    {
        return new SyncApplyResult(null, conflict);
    }
}
