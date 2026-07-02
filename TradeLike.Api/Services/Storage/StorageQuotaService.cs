using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Configuration;
using TradeLike.Api.Contracts.Storage;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Services.Storage;

public sealed class StorageQuotaService
{
    public const string LimitReachedMessage = "Storage limit reached. Existing files remain available, but new uploads are blocked.";

    private readonly TradeLikeDbContext _context;
    private readonly IConfiguration _configuration;

    public StorageQuotaService(TradeLikeDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<StorageUsageResponse> GetUsageAsync(int tenantId, CancellationToken cancellationToken = default)
    {
        var account = await GetOrCreateAccountAsync(tenantId, cancellationToken);
        await SyncPurchasedStorageAsync(account, cancellationToken);
        return await BuildUsageResponseAsync(account, cancellationToken);
    }

    public async Task<StoragePreflightResponse> CanUploadAsync(
        int tenantId,
        long sizeBytes,
        CancellationToken cancellationToken = default)
    {
        if (sizeBytes <= 0)
        {
            return new StoragePreflightResponse(false, "File size must be greater than zero.", 0, 0, 0, null);
        }

        var usage = await GetUsageAsync(tenantId, cancellationToken);
        var canUpload = usage.CanUpload && sizeBytes <= usage.AvailableBytes;

        return new StoragePreflightResponse(
            canUpload,
            canUpload ? "Upload allowed." : LimitReachedMessage,
            usage.EffectiveLimitBytes,
            usage.UsedStorageBytes,
            usage.AvailableBytes,
            canUpload ? BuildBlobKey(tenantId) : null);
    }

    public async Task<StorageObject> RegisterStorageObjectAsync(
        int tenantId,
        StorageFinalizeRequest request,
        int? actorUserId,
        CancellationToken cancellationToken = default)
    {
        if (request.SizeBytes <= 0)
        {
            throw new InvalidOperationException("File size must be greater than zero.");
        }

        var account = await GetOrCreateAccountAsync(tenantId, cancellationToken);
        await SyncPurchasedStorageAsync(account, cancellationToken);
        var effectiveLimit = EffectiveLimit(account);
        if (account.UsedStorageBytes + request.SizeBytes > effectiveLimit)
        {
            throw new StorageQuotaExceededException(LimitReachedMessage);
        }

        var storageObject = new StorageObject
        {
            TenantId = tenantId,
            BlobKey = Clean(request.BlobKey, 500) ?? BuildBlobKey(tenantId),
            FileName = Clean(request.FileName, 255) ?? "upload",
            ContentType = Clean(request.ContentType, 120) ?? "application/octet-stream",
            SizeBytes = request.SizeBytes,
            Category = Clean(request.Category, 60) ?? "Document",
            LinkedEntityType = Clean(request.LinkedEntityType, 80),
            LinkedEntityId = request.LinkedEntityId,
            IsGenerated = request.IsGenerated,
            ParentStorageObjectId = request.ParentStorageObjectId,
            CreatedByUserId = actorUserId,
            CreatedAtUtc = DateTime.UtcNow,
            Status = "Active"
        };

        await _context.StorageObjects.AddAsync(storageObject, cancellationToken);
        account.UsedStorageBytes += request.SizeBytes;
        account.WarningLevel = WarningLevel(account.UsedStorageBytes, effectiveLimit);
        account.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await AddUsageEventAsync(tenantId, storageObject.Id, request.SizeBytes, "UploadFinalized", actorUserId, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return storageObject;
    }

    public async Task<bool> DeleteStorageObjectAsync(
        int tenantId,
        int storageObjectId,
        int? actorUserId,
        CancellationToken cancellationToken = default)
    {
        var storageObject = await _context.StorageObjects
            .FirstOrDefaultAsync(item => item.Id == storageObjectId && item.TenantId == tenantId, cancellationToken);

        if (storageObject is null)
        {
            return false;
        }

        if (string.Equals(storageObject.Status, "Deleted", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var account = await GetOrCreateAccountAsync(tenantId, cancellationToken);
        storageObject.Status = "Deleted";
        storageObject.DeletedAtUtc = DateTime.UtcNow;
        storageObject.DeletedByUserId = actorUserId;

        account.UsedStorageBytes = Math.Max(0, account.UsedStorageBytes - storageObject.SizeBytes);
        account.WarningLevel = WarningLevel(account.UsedStorageBytes, EffectiveLimit(account));
        account.UpdatedAtUtc = DateTime.UtcNow;

        await AddUsageEventAsync(tenantId, storageObject.Id, -storageObject.SizeBytes, "Deleted", actorUserId, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<StorageUsageResponse> RecalculateUsageAsync(
        int tenantId,
        int? actorUserId,
        CancellationToken cancellationToken = default)
    {
        var account = await GetOrCreateAccountAsync(tenantId, cancellationToken);
        var total = await _context.StorageObjects
            .Where(item => item.TenantId == tenantId && item.Status == "Active")
            .SumAsync(item => (long?)item.SizeBytes, cancellationToken) ?? 0;

        var delta = total - account.UsedStorageBytes;
        account.UsedStorageBytes = total;
        account.WarningLevel = WarningLevel(account.UsedStorageBytes, EffectiveLimit(account));
        account.UpdatedAtUtc = DateTime.UtcNow;

        await AddUsageEventAsync(tenantId, null, delta, "Recalculated", actorUserId, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return await BuildUsageResponseAsync(account, cancellationToken);
    }

    public async Task<TenantStorageAddOn> CreatePendingStorageAddOnAsync(
        int tenantId,
        string code,
        CancellationToken cancellationToken = default)
    {
        var plan = await GetAddOnPlanAsync(code, cancellationToken);
        var addOn = new TenantStorageAddOn
        {
            TenantId = tenantId,
            StorageAddOnPlanId = plan.Id,
            StorageAddOnPlan = plan,
            Status = "Pending",
            StripePriceId = ResolveStripePriceId(plan.Code),
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        await _context.TenantStorageAddOns.AddAsync(addOn, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return addOn;
    }

    public async Task ApplyStorageAddOnAsync(
        int tenantId,
        string code,
        string? stripeSubscriptionId,
        string? stripeSubscriptionItemId,
        DateTime? currentPeriodEndUtc,
        CancellationToken cancellationToken = default)
    {
        var plan = await GetAddOnPlanAsync(code, cancellationToken);
        var addOn = await _context.TenantStorageAddOns
            .Include(item => item.StorageAddOnPlan)
            .FirstOrDefaultAsync(item =>
                item.TenantId == tenantId &&
                item.StorageAddOnPlanId == plan.Id &&
                (item.Status == "Pending" || item.Status == "Active"), cancellationToken);

        if (addOn is null)
        {
            addOn = new TenantStorageAddOn
            {
                TenantId = tenantId,
                StorageAddOnPlanId = plan.Id,
                CreatedAtUtc = DateTime.UtcNow
            };
            await _context.TenantStorageAddOns.AddAsync(addOn, cancellationToken);
        }

        addOn.Status = "Active";
        addOn.StripeSubscriptionId = stripeSubscriptionId ?? addOn.StripeSubscriptionId;
        addOn.StripeSubscriptionItemId = stripeSubscriptionItemId ?? addOn.StripeSubscriptionItemId;
        addOn.StripePriceId = ResolveStripePriceId(plan.Code) ?? addOn.StripePriceId;
        addOn.CurrentPeriodEndUtc = currentPeriodEndUtc ?? addOn.CurrentPeriodEndUtc;
        addOn.CancelAtPeriodEnd = false;
        addOn.UpdatedAtUtc = DateTime.UtcNow;

        var account = await GetOrCreateAccountAsync(tenantId, cancellationToken);
        await SyncPurchasedStorageAsync(account, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> RemoveStorageAddOnAsync(
        int tenantId,
        int addOnId,
        bool cancelAtPeriodEnd,
        CancellationToken cancellationToken = default)
    {
        var addOn = await _context.TenantStorageAddOns
            .Include(item => item.StorageAddOnPlan)
            .FirstOrDefaultAsync(item => item.Id == addOnId && item.TenantId == tenantId, cancellationToken);

        if (addOn is null)
        {
            return false;
        }

        addOn.Status = cancelAtPeriodEnd ? "Cancelling" : "Cancelled";
        addOn.CancelAtPeriodEnd = cancelAtPeriodEnd;
        addOn.UpdatedAtUtc = DateTime.UtcNow;

        var account = await GetOrCreateAccountAsync(tenantId, cancellationToken);
        await SyncPurchasedStorageAsync(account, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task SetManualOverrideAsync(
        int tenantId,
        long? manualStorageOverrideBytes,
        int? actorUserId,
        CancellationToken cancellationToken = default)
    {
        var account = await GetOrCreateAccountAsync(tenantId, cancellationToken);
        account.ManualStorageOverrideBytes = manualStorageOverrideBytes;
        account.WarningLevel = WarningLevel(account.UsedStorageBytes, EffectiveLimit(account));
        account.UpdatedAtUtc = DateTime.UtcNow;

        await AddUsageEventAsync(tenantId, null, 0, "ManualOverrideChanged", actorUserId, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task<TenantStorageAccount> GetOrCreateAccountAsync(
        int tenantId,
        CancellationToken cancellationToken)
    {
        var account = await _context.TenantStorageAccounts
            .FirstOrDefaultAsync(item => item.TenantId == tenantId, cancellationToken);

        if (account is not null)
        {
            return account;
        }

        var included = await GetIncludedStorageBytesAsync(tenantId, cancellationToken);
        account = new TenantStorageAccount
        {
            TenantId = tenantId,
            IncludedStorageBytes = included,
            PurchasedStorageBytes = 0,
            UsedStorageBytes = await _context.StorageObjects
                .Where(item => item.TenantId == tenantId && item.Status == "Active")
                .SumAsync(item => (long?)item.SizeBytes, cancellationToken) ?? 0,
            UpdatedAtUtc = DateTime.UtcNow
        };
        account.WarningLevel = WarningLevel(account.UsedStorageBytes, EffectiveLimit(account));

        await _context.TenantStorageAccounts.AddAsync(account, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return account;
    }

    private async Task<long> GetIncludedStorageBytesAsync(int tenantId, CancellationToken cancellationToken)
    {
        var subscription = await _context.Subscriptions
            .AsNoTracking()
            .Include(item => item.Plan)
            .FirstOrDefaultAsync(item => item.TenantId == tenantId, cancellationToken);

        if (subscription?.Plan?.IncludedStorageBytes is long included && included > 0)
        {
            return included;
        }

        return await _context.Users
            .AsNoTracking()
            .Where(user => user.Id == tenantId || user.TenantId == tenantId)
            .Select(user => user.SubscriptionPlan)
            .FirstOrDefaultAsync(cancellationToken) switch
        {
            "Team" => PlanPricing.TeamIncludedStorageBytes,
            "Business" => PlanPricing.BusinessIncludedStorageBytes,
            "Enterprise" => 0,
            _ => PlanPricing.SoloIncludedStorageBytes
        };
    }

    private async Task SyncPurchasedStorageAsync(TenantStorageAccount account, CancellationToken cancellationToken)
    {
        var purchased = await _context.TenantStorageAddOns
            .Where(addOn => addOn.TenantId == account.TenantId && addOn.Status == "Active")
            .Join(
                _context.StorageAddOnPlans,
                addOn => addOn.StorageAddOnPlanId,
                plan => plan.Id,
                (_, plan) => plan.ExtraStorageBytes)
            .SumAsync(cancellationToken);

        if (account.PurchasedStorageBytes != purchased)
        {
            account.PurchasedStorageBytes = purchased;
            account.WarningLevel = WarningLevel(account.UsedStorageBytes, EffectiveLimit(account));
            account.UpdatedAtUtc = DateTime.UtcNow;
        }
    }

    private async Task<StorageUsageResponse> BuildUsageResponseAsync(
        TenantStorageAccount account,
        CancellationToken cancellationToken)
    {
        var effectiveLimit = EffectiveLimit(account);
        var addOnPlans = await _context.StorageAddOnPlans
            .AsNoTracking()
            .Where(plan => plan.IsActive)
            .OrderBy(plan => plan.ExtraStorageBytes)
            .Select(plan => new StorageAddOnPlanResponse(
                plan.Code,
                plan.Label,
                plan.ExtraStorageBytes,
                plan.MonthlyPricePence,
                plan.IsActive))
            .ToListAsync(cancellationToken);

        var activeAddOns = await _context.TenantStorageAddOns
            .AsNoTracking()
            .Include(addOn => addOn.StorageAddOnPlan)
            .Where(addOn => addOn.TenantId == account.TenantId && addOn.Status != "Cancelled")
            .OrderBy(addOn => addOn.CreatedAtUtc)
            .Select(addOn => new TenantStorageAddOnResponse(
                addOn.Id,
                addOn.StorageAddOnPlan == null ? string.Empty : addOn.StorageAddOnPlan.Code,
                addOn.StorageAddOnPlan == null ? "Storage add-on" : addOn.StorageAddOnPlan.Label,
                addOn.StorageAddOnPlan == null ? 0 : addOn.StorageAddOnPlan.ExtraStorageBytes,
                addOn.StorageAddOnPlan == null ? 0 : addOn.StorageAddOnPlan.MonthlyPricePence,
                addOn.Status,
                addOn.CurrentPeriodEndUtc,
                addOn.CancelAtPeriodEnd))
            .ToListAsync(cancellationToken);

        var available = Math.Max(0, effectiveLimit - account.UsedStorageBytes);
        var percent = effectiveLimit <= 0
            ? 0
            : Math.Round((decimal)account.UsedStorageBytes / effectiveLimit * 100, 1);

        return new StorageUsageResponse(
            account.IncludedStorageBytes,
            account.PurchasedStorageBytes,
            account.ManualStorageOverrideBytes,
            effectiveLimit,
            account.UsedStorageBytes,
            available,
            percent,
            WarningLevel(account.UsedStorageBytes, effectiveLimit),
            account.UsedStorageBytes < effectiveLimit,
            addOnPlans,
            activeAddOns);
    }

    private async Task<StorageAddOnPlan> GetAddOnPlanAsync(string code, CancellationToken cancellationToken)
    {
        var normalized = code.Trim().ToLowerInvariant();
        return await _context.StorageAddOnPlans
            .FirstOrDefaultAsync(plan => plan.Code.ToLower() == normalized && plan.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Storage add-on plan is not configured.");
    }

    private async Task AddUsageEventAsync(
        int tenantId,
        int? storageObjectId,
        long deltaBytes,
        string reason,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        await _context.StorageUsageEvents.AddAsync(new StorageUsageEvent
        {
            TenantId = tenantId,
            StorageObjectId = storageObjectId,
            DeltaBytes = deltaBytes,
            Reason = reason,
            ActorUserId = actorUserId,
            CreatedAtUtc = DateTime.UtcNow
        }, cancellationToken);
    }

    private string? ResolveStripePriceId(string code)
    {
        var key = code switch
        {
            "extra-50gb" => "StorageAddOns:Extra50GB:StripePriceId",
            "extra-100gb" => "StorageAddOns:Extra100GB:StripePriceId",
            "extra-250gb" => "StorageAddOns:Extra250GB:StripePriceId",
            "extra-500gb" => "StorageAddOns:Extra500GB:StripePriceId",
            "extra-1tb" => "StorageAddOns:Extra1TB:StripePriceId",
            _ => string.Empty
        };

        return string.IsNullOrWhiteSpace(key) ? null : _configuration[key];
    }

    private static long EffectiveLimit(TenantStorageAccount account)
    {
        return account.ManualStorageOverrideBytes ?? account.IncludedStorageBytes + account.PurchasedStorageBytes;
    }

    private static string WarningLevel(long usedBytes, long effectiveLimit)
    {
        if (effectiveLimit <= 0)
        {
            return "OK";
        }

        var percent = (decimal)usedBytes / effectiveLimit;
        return percent >= 1m ? "Blocked" : percent >= 0.95m ? "Critical" : percent >= 0.8m ? "Warning" : "OK";
    }

    private static string BuildBlobKey(int tenantId)
    {
        return $"tenants/{tenantId}/{Guid.NewGuid():N}";
    }

    private static string? Clean(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }
}

public sealed class StorageQuotaExceededException : InvalidOperationException
{
    public StorageQuotaExceededException(string message) : base(message)
    {
    }
}
