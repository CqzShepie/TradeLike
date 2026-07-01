using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TradeLike.Api.Configuration;

namespace TradeLike.Api.PublicApi;

public sealed class PublicApiGatewayAuthorizer
{
    private readonly JwtSettings _jwtSettings;
    private readonly JwtSecurityTokenHandler _tokenHandler = new();

    public PublicApiGatewayAuthorizer(IOptions<JwtSettings> jwtSettings)
    {
        _jwtSettings = jwtSettings.Value;
    }

    public PublicApiAuthorizationResult Authorize(HttpContext context, string requiredScope)
    {
        var authorization = context.Request.Headers.Authorization.ToString();
        if (!authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return PublicApiAuthorizationResult.Fail(StatusCodes.Status401Unauthorized, "Bearer token is required.");
        }

        var token = authorization["Bearer ".Length..].Trim();
        if (token.Length == 0)
        {
            return PublicApiAuthorizationResult.Fail(StatusCodes.Status401Unauthorized, "Bearer token is required.");
        }

        ClaimsPrincipal principal;
        try
        {
            principal = _tokenHandler.ValidateToken(token, BuildValidationParameters(), out var validatedToken);
            if (validatedToken is not JwtSecurityToken jwt ||
                !string.Equals(jwt.Header.Alg, SecurityAlgorithms.HmacSha256, StringComparison.Ordinal))
            {
                return PublicApiAuthorizationResult.Fail(StatusCodes.Status401Unauthorized, "Bearer token is invalid.");
            }
        }
        catch (SecurityTokenException)
        {
            return PublicApiAuthorizationResult.Fail(StatusCodes.Status401Unauthorized, "Bearer token is invalid.");
        }
        catch (ArgumentException)
        {
            return PublicApiAuthorizationResult.Fail(StatusCodes.Status401Unauthorized, "Bearer token is invalid.");
        }

        var role = principal.FindFirstValue(ClaimTypes.Role) ?? principal.FindFirstValue("role");
        if (!string.Equals(role, PublicApiConstants.ClientRole, StringComparison.Ordinal))
        {
            return PublicApiAuthorizationResult.Fail(StatusCodes.Status403Forbidden, "Token is not a public API client token.");
        }

        var tenantClaim = principal.FindFirstValue("tid");
        if (!int.TryParse(tenantClaim, out var tenantId) || tenantId <= 0)
        {
            return PublicApiAuthorizationResult.Fail(StatusCodes.Status401Unauthorized, "Token tenant is invalid.");
        }

        var scopes = SplitScopes(principal.FindFirstValue("scope"));
        if (!scopes.Contains(requiredScope, StringComparer.OrdinalIgnoreCase))
        {
            return PublicApiAuthorizationResult.Fail(StatusCodes.Status403Forbidden, "Token scope is not sufficient.");
        }

        var clientId = principal.FindFirstValue("client_id") ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? "unknown";
        if (!PublicApiRateLimiter.TryAcquire(clientId, out var retryAfterSeconds))
        {
            context.Response.Headers["Retry-After"] = retryAfterSeconds.ToString();
            return PublicApiAuthorizationResult.Fail(StatusCodes.Status429TooManyRequests, "Public API rate limit exceeded.");
        }

        context.Response.Headers["X-RateLimit-Limit"] = PublicApiRateLimiter.PermitLimit.ToString();
        context.Response.Headers["X-RateLimit-Remaining"] = PublicApiRateLimiter.GetRemaining(clientId).ToString();

        return PublicApiAuthorizationResult.Success(tenantId, clientId, scopes);
    }

    private TokenValidationParameters BuildValidationParameters()
    {
        return new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = _jwtSettings.Issuer,
            ValidAudience = _jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Key)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    }

    private static IReadOnlyCollection<string> SplitScopes(string? scopes)
    {
        return (scopes ?? string.Empty)
            .Split([' ', ',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }
}

public sealed record PublicApiAuthorizationResult(
    bool Succeeded,
    int StatusCode,
    string Error,
    int TenantId,
    string ClientId,
    IReadOnlyCollection<string> Scopes)
{
    public static PublicApiAuthorizationResult Success(
        int tenantId,
        string clientId,
        IReadOnlyCollection<string> scopes)
    {
        return new PublicApiAuthorizationResult(true, StatusCodes.Status200OK, string.Empty, tenantId, clientId, scopes);
    }

    public static PublicApiAuthorizationResult Fail(int statusCode, string error)
    {
        return new PublicApiAuthorizationResult(false, statusCode, error, 0, string.Empty, Array.Empty<string>());
    }
}

internal static class PublicApiRateLimiter
{
    public const int PermitLimit = 60;

    private static readonly ConcurrentDictionary<string, RateWindow> Windows = new(StringComparer.Ordinal);

    public static bool TryAcquire(string key, out int retryAfterSeconds)
    {
        var now = DateTimeOffset.UtcNow;
        var window = Windows.GetOrAdd(key, _ => new RateWindow(now));

        lock (window)
        {
            if (now - window.StartedAt >= TimeSpan.FromMinutes(1))
            {
                window.StartedAt = now;
                window.Count = 0;
            }

            if (window.Count >= PermitLimit)
            {
                retryAfterSeconds = Math.Max(1, 60 - (int)(now - window.StartedAt).TotalSeconds);
                return false;
            }

            window.Count++;
            retryAfterSeconds = 0;
            return true;
        }
    }

    public static int GetRemaining(string key)
    {
        if (!Windows.TryGetValue(key, out var window))
        {
            return PermitLimit;
        }

        lock (window)
        {
            return Math.Max(0, PermitLimit - window.Count);
        }
    }

    private sealed class RateWindow
    {
        public RateWindow(DateTimeOffset startedAt)
        {
            StartedAt = startedAt;
        }

        public DateTimeOffset StartedAt { get; set; }

        public int Count { get; set; }
    }
}
