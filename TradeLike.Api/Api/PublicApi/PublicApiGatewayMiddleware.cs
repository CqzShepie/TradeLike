using Microsoft.Extensions.Options;
using TradeLike.Api.Configuration;

namespace TradeLike.Api.PublicApi;

public sealed class PublicApiGatewayMiddleware
{
    private readonly RequestDelegate _next;
    private readonly PublicApiGatewayAuthorizer _authorizer;

    public PublicApiGatewayMiddleware(
        RequestDelegate next,
        IOptions<JwtSettings> jwtSettings)
    {
        _next = next;
        _authorizer = new PublicApiGatewayAuthorizer(jwtSettings);
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Path.StartsWithSegments("/api/public/v1", out var remainingPath))
        {
            await _next(context);
            return;
        }

        var scope = ResolveScope(remainingPath);
        var authorization = _authorizer.Authorize(context, scope);
        if (!authorization.Succeeded)
        {
            context.Response.StatusCode = authorization.StatusCode;
            await context.Response.WriteAsJsonAsync(new { error = authorization.Error });
            return;
        }

        context.Items["PublicApiTenantId"] = authorization.TenantId;
        context.Items["PublicApiClientId"] = authorization.ClientId;

        await _next(context);
    }

    private static string ResolveScope(PathString path)
    {
        if (path.StartsWithSegments("/jobs"))
        {
            return "jobs:read";
        }

        if (path.StartsWithSegments("/invoices"))
        {
            return "invoices:read";
        }

        return "customers:read";
    }
}
