using TradeLike.Api.Data;
using TradeLike.Api.PublicApi;

namespace TradeLike.Api.Branding;

public sealed class WhiteLabelBrandingMiddleware
{
    private readonly RequestDelegate _next;

    public WhiteLabelBrandingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, TradeLikeDbContext dbContext)
    {
        var host = context.Request.Host.Host;
        if (!string.IsNullOrWhiteSpace(host))
        {
            var profiles = await RawSql.QueryAsync(
                dbContext,
                """
                SELECT TOP 1 [BrandName], [PrimaryColor], [AccentColor], [HideTradeLikeBranding]
                FROM [TenantBranding]
                WHERE LOWER([CustomDomain]) = LOWER(@Host)
                """,
                reader => new
                {
                    BrandName = RawSql.ReadString(reader, "BrandName"),
                    PrimaryColor = RawSql.ReadString(reader, "PrimaryColor", "#2563eb"),
                    AccentColor = RawSql.ReadString(reader, "AccentColor", "#14b8a6"),
                    HideTradeLikeBranding = RawSql.ReadBool(reader, "HideTradeLikeBranding")
                },
                context.RequestAborted,
                new SqlParam("@Host", host.Trim().ToLowerInvariant()));

            var profile = profiles.FirstOrDefault();
            if (profile is not null)
            {
                context.Items["BrandName"] = profile.BrandName;
                context.Items["BrandPrimaryColor"] = profile.PrimaryColor;
                context.Items["BrandAccentColor"] = profile.AccentColor;
                context.Response.Headers["X-TradeLike-Brand"] = profile.BrandName;
                context.Response.Headers["X-TradeLike-Brand-Primary"] = profile.PrimaryColor;
                context.Response.Headers["X-TradeLike-Brand-Accent"] = profile.AccentColor;
                context.Response.Headers["X-TradeLike-Brand-Hide-Platform"] = profile.HideTradeLikeBranding.ToString();
            }
        }

        await _next(context);
    }
}
