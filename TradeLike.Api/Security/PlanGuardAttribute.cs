using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;

namespace TradeLike.Api.Security;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class PlanGuardAttribute : Attribute, IAsyncActionFilter
{
    private readonly Feature _feature;

    public PlanGuardAttribute(Feature feature)
    {
        _feature = feature;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var dbContext = context.HttpContext.RequestServices.GetRequiredService<TradeLikeDbContext>();
        var tenantId = TenantHelpers.GetTenantId(context.HttpContext);

        var subscription = await dbContext.Subscriptions
            .AsNoTracking()
            .Include(item => item.Plan)
            .FirstOrDefaultAsync(item => item.TenantId == tenantId);

        if (subscription?.Plan is null || !FeatureAllowed(subscription.Plan.Name, _feature))
        {
            context.Result = UpgradeRequired();
            return;
        }

        if (ManagerSeatLimitExceeded(subscription.Plan.Name, subscription.SeatsPurchased,
                await CountManagersAsync(dbContext, tenantId)))
        {
            context.Result = UpgradeRequired();
            return;
        }

        await next();
    }

    private static async Task<int> CountManagersAsync(TradeLikeDbContext dbContext, int tenantId)
    {
        return await dbContext.Users
            .AsNoTracking()
            .CountAsync(user => user.TenantId == tenantId && user.Role == CustomerRoles.Manager);
    }

    private static bool FeatureAllowed(string planName, Feature feature)
    {
        var normalizedPlan = planName.Trim().ToLowerInvariant();

        return feature switch
        {
            Feature.LeaveManagement or Feature.TeamManagement or Feature.Reports or Feature.WorkflowAutomations =>
                normalizedPlan is "team" or "business" or "enterprise",
            Feature.Billing => true,
            _ => false
        };
    }

    public static bool ManagerSeatLimitExceeded(string planName, int seatsPurchased, int managerSeats)
    {
        var normalizedPlan = planName.Trim().ToLowerInvariant();

        var managersAllowed = normalizedPlan switch
        {
            "solo" => 0,
            "team" or "business" => seatsPurchased,
            "enterprise" => int.MaxValue,
            _ => 0
        };

        return managerSeats > managersAllowed;
    }

    private static ObjectResult UpgradeRequired()
    {
        return new ObjectResult(new { error = "Upgrade required" })
        {
            StatusCode = StatusCodes.Status402PaymentRequired
        };
    }
}
