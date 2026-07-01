using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace TradeLike.Api.Security;

public static class TenantHelpers
{
    public static int GetTenantId(HttpContext context)
    {
        var user = context.User;

        if (user?.Identity?.IsAuthenticated != true)
        {
            throw new UnauthorizedAccessException("Authenticated user is required.");
        }

        var tenantClaim =
            user.FindFirstValue("tid") ??
            user.FindFirstValue("tenant_id") ??
            user.FindFirstValue("TenantId");

        if (int.TryParse(tenantClaim, out var tenantId) && tenantId > 0)
        {
            return tenantId;
        }

        /*
         * Backwards-compatible fallback for older local tokens created before
         * the tenant-id claim was added.
         *
         * For original single-tenant owner accounts, the tenant id was the same
         * as the user id. This prevents local development from hard-crashing
         * with "missing tenant id" after older tokens or migrated users.
         *
         * New login tokens should still contain "tid".
         */
        var userIdClaim =
            user.FindFirstValue(ClaimTypes.NameIdentifier) ??
            user.FindFirstValue(JwtRegisteredClaimNames.Sub) ??
            user.FindFirstValue("sub");

        if (int.TryParse(userIdClaim, out var userId) && userId > 0)
        {
            return userId;
        }

        throw new InvalidOperationException("Authenticated token is missing a valid tenant id.");
    }
}