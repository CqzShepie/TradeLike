using System.Security.Claims;

namespace TradeLike.Api.Security;

public static class TenantHelpers
{
    public static int GetTenantId(HttpContext context)
    {
        var tenantClaim = context.User.FindFirstValue("tid");

        if (!int.TryParse(tenantClaim, out var tenantId) || tenantId <= 0)
        {
            throw new InvalidOperationException("Authenticated token is missing a valid tenant id.");
        }

        return tenantId;
    }
}
