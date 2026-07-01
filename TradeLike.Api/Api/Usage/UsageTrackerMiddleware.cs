using System.Security.Claims;

namespace TradeLike.Api.Api.Usage;

public sealed class UsageTrackerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly UsageCounterStore _store;

    public UsageTrackerMiddleware(RequestDelegate next, UsageCounterStore store)
    {
        _next = next;
        _store = store;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!int.TryParse(context.User.FindFirstValue("tid"), out var tenantId) || tenantId <= 0)
        {
            await _next(context);
            return;
        }

        var plan = context.User.FindFirstValue("plan") ?? "Solo";
        var result = _store.TrackRequest(tenantId, plan);

        if (!result.IsAllowed)
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers["X-RateLimit-Reset"] = result.ResetAtUtc?.ToUnixTimeSeconds().ToString() ?? string.Empty;
            await context.Response.WriteAsJsonAsync(new { error = "Too many requests." });
            return;
        }

        await _next(context);
    }
}
