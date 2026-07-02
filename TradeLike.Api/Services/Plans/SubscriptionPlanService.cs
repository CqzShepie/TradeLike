using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Services.Plans;

public sealed class SubscriptionPlanService
{
    private static readonly string[] CustomerPlans =
    {
        "Solo",
        "Team",
        "Business",
        "Enterprise"
    };

    private readonly TradeLikeDbContext _context;

    public SubscriptionPlanService(TradeLikeDbContext context)
    {
        _context = context;
    }

    public async Task<PlanChangeResult> ApplyCustomerPlanChangeAsync(
        User user,
        string requestedPlanName,
        int seatsPurchased,
        string billingStatus,
        CancellationToken cancellationToken = default)
    {
        var plan = await GetRequiredCustomerPlanAsync(requestedPlanName, cancellationToken);
        ValidateSeats(plan.Name, seatsPurchased);

        var tenantId = GetTenantId(user);
        var subscription = await _context.Subscriptions
            .Include(existingSubscription => existingSubscription.Plan)
            .FirstOrDefaultAsync(existingSubscription => existingSubscription.TenantId == tenantId, cancellationToken);

        var result = new PlanChangeResult(
            OldPlan: subscription?.Plan?.Name ?? user.SubscriptionPlan,
            NewPlan: plan.Name,
            OldSeats: subscription?.SeatsPurchased,
            NewSeats: seatsPurchased,
            OldBillingStatus: subscription?.Status ?? user.BillingStatus,
            NewBillingStatus: billingStatus,
            CreatedSubscription: subscription is null,
            RepairedPlanMismatch: subscription?.Plan is not null &&
                !string.Equals(subscription.Plan.Name, user.SubscriptionPlan, StringComparison.OrdinalIgnoreCase));

        user.TenantId = tenantId;
        user.SubscriptionPlan = plan.Name;
        user.BillingStatus = billingStatus;
        user.UpdatedAt = DateTime.UtcNow;

        if (subscription is null)
        {
            subscription = new Subscription
            {
                TenantId = tenantId,
                BillingStartUtc = DateTime.UtcNow,
                NextInvoiceDateUtc = DateTime.UtcNow.AddMonths(1)
            };

            await _context.Subscriptions.AddAsync(subscription, cancellationToken);
        }

        subscription.PlanId = plan.Id;
        subscription.Plan = plan;
        subscription.SeatsPurchased = seatsPurchased;
        subscription.Status = billingStatus;

        return result;
    }

    public async Task SyncBillingStatusAsync(
        User user,
        string billingStatus,
        CancellationToken cancellationToken = default)
    {
        var tenantId = GetTenantId(user);
        var subscription = await _context.Subscriptions
            .FirstOrDefaultAsync(existingSubscription => existingSubscription.TenantId == tenantId, cancellationToken);

        if (subscription is not null)
        {
            subscription.Status = billingStatus;
        }
    }

    public async Task<Plan> GetRequiredCustomerPlanAsync(
        string requestedPlanName,
        CancellationToken cancellationToken = default)
    {
        var planName = CanonicalizeCustomerPlan(requestedPlanName);
        var normalizedPlanName = planName.ToLowerInvariant();
        var plan = await _context.Plans
            .FirstOrDefaultAsync(existingPlan => existingPlan.Name.ToLower() == normalizedPlanName, cancellationToken);

        return plan ?? throw new ValidationException($"Subscription plan '{planName}' is not configured.");
    }

    public async Task<int> GetCompatibleSeatCountAsync(
        User user,
        string requestedPlanName,
        CancellationToken cancellationToken = default)
    {
        var planName = CanonicalizeCustomerPlan(requestedPlanName);
        var tenantId = GetTenantId(user);
        var subscription = await _context.Subscriptions
            .AsNoTracking()
            .FirstOrDefaultAsync(existingSubscription => existingSubscription.TenantId == tenantId, cancellationToken);

        return subscription is not null && IsValidSeatCount(planName, subscription.SeatsPurchased)
            ? subscription.SeatsPurchased
            : DefaultSeatsForPlan(planName);
    }

    public async Task<Plan> GetRequiredPlanAsync(
        string requestedPlanName,
        CancellationToken cancellationToken = default)
    {
        var planName = CanonicalizePlanName(requestedPlanName);
        var normalizedPlanName = planName.ToLowerInvariant();
        var plan = await _context.Plans
            .FirstOrDefaultAsync(existingPlan => existingPlan.Name.ToLower() == normalizedPlanName, cancellationToken);

        return plan ?? throw new ValidationException($"Subscription plan '{planName}' is not configured.");
    }

    public static string CanonicalizeCustomerPlan(string requestedPlanName)
    {
        var planName = CanonicalizePlanName(requestedPlanName);

        if (string.Equals(planName, "Internal", StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("Internal plan is only available for internal staff accounts.");
        }

        if (!CustomerPlans.Contains(planName, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException("Customer plan must be Solo, Team, Business, or Enterprise.");
        }

        return planName;
    }

    public static string CanonicalizePlanName(string requestedPlanName)
    {
        var trimmed = requestedPlanName.Trim();
        var knownPlans = CustomerPlans.Concat(new[] { "Internal", "Trial" });
        return knownPlans.FirstOrDefault(plan => string.Equals(plan, trimmed, StringComparison.OrdinalIgnoreCase))
            ?? trimmed;
    }

    public static void ValidateSeats(string plan, int seatsPurchased)
    {
        switch (plan)
        {
            case "Solo" when seatsPurchased != 1:
                throw new ValidationException("Solo plan must have exactly 1 seat.");
            case "Team" when seatsPurchased < 2 || seatsPurchased > 10:
                throw new ValidationException("Team plan seats must be between 2 and 10.");
            case "Business" when seatsPurchased < 11 || seatsPurchased > 25:
                throw new ValidationException("Business plan seats must be between 11 and 25.");
            case "Enterprise" when seatsPurchased < 1:
                throw new ValidationException("Enterprise plan must have at least 1 seat.");
        }
    }

    public static int DefaultSeatsForPlan(string plan)
    {
        return plan switch
        {
            "Team" => 2,
            "Business" => 11,
            _ => 1
        };
    }

    private static int GetTenantId(User user)
    {
        return user.TenantId == 0 ? user.Id : user.TenantId;
    }

    private static bool IsValidSeatCount(string plan, int seatsPurchased)
    {
        return plan switch
        {
            "Solo" => seatsPurchased == 1,
            "Team" => seatsPurchased >= 2 && seatsPurchased <= 10,
            "Business" => seatsPurchased >= 11 && seatsPurchased <= 25,
            "Enterprise" => seatsPurchased >= 1,
            _ => false
        };
    }
}

public sealed record PlanChangeResult(
    string OldPlan,
    string NewPlan,
    int? OldSeats,
    int NewSeats,
    string OldBillingStatus,
    string NewBillingStatus,
    bool CreatedSubscription,
    bool RepairedPlanMismatch)
{
    public string ToAuditDetails(string reason)
    {
        return
            $"Reason: {reason}. " +
            $"OldPlan={OldPlan}; NewPlan={NewPlan}; " +
            $"OldSeats={(OldSeats.HasValue ? OldSeats.Value.ToString() : "none")}; NewSeats={NewSeats}; " +
            $"OldBillingStatus={OldBillingStatus}; NewBillingStatus={NewBillingStatus}; " +
            $"CreatedSubscription={CreatedSubscription}; RepairedPlanMismatch={RepairedPlanMismatch}.";
    }
}
