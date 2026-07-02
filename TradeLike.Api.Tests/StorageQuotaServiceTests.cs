using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TradeLike.Api.Configuration;
using TradeLike.Api.Contracts.Storage;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Services.Storage;
using Xunit;

namespace TradeLike.Api.Tests;

public sealed class StorageQuotaServiceTests
{
    [Fact]
    public async Task SoloTenantGetsTenGbIncludedStorage()
    {
        await using var context = CreateContext();
        await SeedTenantAsync(context, "Solo");
        var service = CreateService(context);

        var usage = await service.GetUsageAsync(1);

        Assert.Equal(PlanPricing.SoloIncludedStorageBytes, usage.IncludedStorageBytes);
        Assert.Equal(10_000_000_000, usage.EffectiveLimitBytes);
        Assert.True(usage.CanUpload);
    }

    [Fact]
    public async Task UploadPreflightBlocksNewUploadsAtLimitWithoutDeletingExistingFiles()
    {
        await using var context = CreateContext();
        await SeedTenantAsync(context, "Solo");
        context.TenantStorageAccounts.Add(new TenantStorageAccount
        {
            TenantId = 1,
            IncludedStorageBytes = PlanPricing.SoloIncludedStorageBytes,
            UsedStorageBytes = PlanPricing.SoloIncludedStorageBytes,
            WarningLevel = "Blocked"
        });
        context.StorageObjects.Add(new StorageObject
        {
            TenantId = 1,
            BlobKey = "tenants/1/existing",
            FileName = "existing.pdf",
            ContentType = "application/pdf",
            SizeBytes = PlanPricing.SoloIncludedStorageBytes,
            Category = "Document",
            Status = "Active"
        });
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var preflight = await service.CanUploadAsync(1, 1);

        Assert.False(preflight.CanUpload);
        Assert.Equal(StorageQuotaService.LimitReachedMessage, preflight.Message);
        Assert.Equal("Active", (await context.StorageObjects.SingleAsync()).Status);
    }

    [Fact]
    public async Task RegisteringGeneratedPreviewCountsTowardUsageAndDeleteDecrementsIt()
    {
        await using var context = CreateContext();
        await SeedTenantAsync(context, "Team");
        var service = CreateService(context);

        var storageObject = await service.RegisterStorageObjectAsync(
            1,
            new StorageFinalizeRequest(
                "tenants/1/preview",
                "preview.jpg",
                "image/jpeg",
                2_500_000,
                "Preview",
                "Job",
                44,
                true,
                null),
            actorUserId: 1);

        var afterUpload = await service.GetUsageAsync(1);
        Assert.True(storageObject.IsGenerated);
        Assert.Equal(2_500_000, afterUpload.UsedStorageBytes);

        await service.DeleteStorageObjectAsync(1, storageObject.Id, actorUserId: 1);

        var afterDelete = await service.GetUsageAsync(1);
        Assert.Equal(0, afterDelete.UsedStorageBytes);
        Assert.Contains(await context.StorageUsageEvents.ToListAsync(), item => item.DeltaBytes == -2_500_000);
    }

    [Fact]
    public async Task PendingStorageAddOnDoesNotIncreaseQuotaUntilPaymentIsConfirmed()
    {
        await using var context = CreateContext();
        await SeedTenantAsync(context, "Solo");
        var service = CreateService(context);

        await service.CreatePendingStorageAddOnAsync(1, "extra-50gb");
        var pendingUsage = await service.GetUsageAsync(1);

        Assert.Equal(PlanPricing.SoloIncludedStorageBytes, pendingUsage.EffectiveLimitBytes);

        await service.ApplyStorageAddOnAsync(1, "extra-50gb", "sub_123", "si_123", DateTime.UtcNow.AddMonths(1));
        var activeUsage = await service.GetUsageAsync(1);

        Assert.Equal(60_000_000_000, activeUsage.EffectiveLimitBytes);
        Assert.Equal(50_000_000_000, activeUsage.PurchasedStorageBytes);
    }

    [Fact]
    public async Task ManualOverrideControlsEffectiveLimitForEnterprise()
    {
        await using var context = CreateContext();
        await SeedTenantAsync(context, "Enterprise");
        var service = CreateService(context);

        await service.SetManualOverrideAsync(1, 2_000_000_000_000, actorUserId: 99);

        var usage = await service.GetUsageAsync(1);
        Assert.Equal(2_000_000_000_000, usage.EffectiveLimitBytes);
        Assert.Equal(2_000_000_000_000, usage.ManualStorageOverrideBytes);
    }

    private static TradeLikeDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<TradeLikeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new TradeLikeDbContext(options);
    }

    private static StorageQuotaService CreateService(TradeLikeDbContext context)
    {
        return new StorageQuotaService(context, new ConfigurationBuilder().Build());
    }

    private static async Task SeedTenantAsync(TradeLikeDbContext context, string planName)
    {
        context.Plans.AddRange(
            BuildPlan(1, "Solo", PlanPricing.SoloIncludedStorageBytes),
            BuildPlan(2, "Team", PlanPricing.TeamIncludedStorageBytes),
            BuildPlan(3, "Business", PlanPricing.BusinessIncludedStorageBytes),
            BuildPlan(4, "Enterprise", null));

        context.StorageAddOnPlans.AddRange(
            new StorageAddOnPlan { Id = 1, Code = "extra-50gb", Label = "Extra 50GB", ExtraStorageBytes = 50 * PlanPricing.GigabyteBytes, MonthlyPricePence = 495, IsActive = true },
            new StorageAddOnPlan { Id = 2, Code = "extra-100gb", Label = "Extra 100GB", ExtraStorageBytes = 100 * PlanPricing.GigabyteBytes, MonthlyPricePence = 895, IsActive = true });

        context.Users.Add(new User
        {
            Id = 1,
            TenantId = 1,
            FirstName = "Alex",
            LastName = "Owner",
            Email = "owner@example.com",
            PasswordHash = "hash",
            Role = "CustomerDirector",
            AccountStatus = "Active",
            SubscriptionPlan = planName,
            BillingStatus = "Active",
            DiscountType = "None",
            HealthStatus = "Green",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        context.Subscriptions.Add(new Subscription
        {
            TenantId = 1,
            PlanId = planName switch
            {
                "Team" => 2,
                "Business" => 3,
                "Enterprise" => 4,
                _ => 1
            },
            SeatsPurchased = planName switch
            {
                "Team" => 2,
                "Business" => 11,
                _ => 1
            },
            Status = "Active",
            BillingStartUtc = DateTime.UtcNow,
            NextInvoiceDateUtc = DateTime.UtcNow.AddMonths(1)
        });

        await context.SaveChangesAsync();
    }

    private static Plan BuildPlan(int id, string name, long? includedStorageBytes)
    {
        return new Plan
        {
            Id = id,
            Name = name,
            MonthlyPricePence = name switch
            {
                "Solo" => PlanPricing.SoloMonthlyPricePence,
                "Team" => PlanPricing.TeamMonthlyPricePence,
                "Business" => PlanPricing.BusinessMonthlyPricePence,
                _ => null
            },
            MaxIncludedUsers = name switch
            {
                "Solo" => 1,
                "Team" => 10,
                "Business" => 25,
                _ => null
            },
            IncludedStorageBytes = includedStorageBytes,
            CreatedAt = DateTime.UtcNow
        };
    }
}
