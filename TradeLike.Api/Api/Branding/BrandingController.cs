using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Data;
using TradeLike.Api.PublicApi;
using TradeLike.Api.Security;

namespace TradeLike.Api.Branding;

[ApiController]
[Route("api/branding")]
public sealed class BrandingController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public BrandingController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [Authorize(Policy = "RequireDirectorRole")]
    [HttpGet]
    public async Task<ActionResult<BrandingProfileResponse>> Get(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var profile = await LoadTenantProfileAsync(tenantId, cancellationToken);
        return Ok(profile ?? BrandingProfileResponse.Default(tenantId));
    }

    [Authorize(Policy = "RequireDirectorRole")]
    [HttpPut]
    public async Task<ActionResult<BrandingProfileResponse>> Update(
        [FromBody] UpdateBrandingProfileRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var validationError = Validate(request);

        if (validationError is not null)
        {
            return BadRequest(new { error = validationError });
        }

        var exists = await RawSql.ScalarAsync(
            _context,
            "SELECT TOP 1 [Id] FROM [TenantBranding] WHERE [TenantId] = @TenantId",
            cancellationToken,
            new SqlParam("@TenantId", tenantId));

        if (exists is null)
        {
            await RawSql.ExecuteAsync(
                _context,
                """
                INSERT INTO [TenantBranding]
                    ([TenantId], [BrandName], [LogoUrl], [PrimaryColor], [AccentColor], [SupportEmail], [CustomDomain], [HideTradeLikeBranding], [UpdatedAtUtc])
                VALUES
                    (@TenantId, @BrandName, @LogoUrl, @PrimaryColor, @AccentColor, @SupportEmail, @CustomDomain, @HideTradeLikeBranding, SYSUTCDATETIME())
                """,
                cancellationToken,
                BuildParameters(tenantId, request));
        }
        else
        {
            await RawSql.ExecuteAsync(
                _context,
                """
                UPDATE [TenantBranding]
                SET [BrandName] = @BrandName,
                    [LogoUrl] = @LogoUrl,
                    [PrimaryColor] = @PrimaryColor,
                    [AccentColor] = @AccentColor,
                    [SupportEmail] = @SupportEmail,
                    [CustomDomain] = @CustomDomain,
                    [HideTradeLikeBranding] = @HideTradeLikeBranding,
                    [UpdatedAtUtc] = SYSUTCDATETIME()
                WHERE [TenantId] = @TenantId
                """,
                cancellationToken,
                BuildParameters(tenantId, request));
        }

        return Ok(await LoadTenantProfileAsync(tenantId, cancellationToken) ?? BrandingProfileResponse.Default(tenantId));
    }

    [AllowAnonymous]
    [HttpGet("public")]
    public async Task<ActionResult<PublicBrandingResponse>> Public(
        [FromQuery] string host,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(host))
        {
            return BadRequest(new { error = "Host is required." });
        }

        var profiles = await RawSql.QueryAsync(
            _context,
            """
            SELECT TOP 1 [BrandName], [LogoUrl], [PrimaryColor], [AccentColor], [SupportEmail], [CustomDomain], [HideTradeLikeBranding]
            FROM [TenantBranding]
            WHERE LOWER([CustomDomain]) = LOWER(@Host)
            """,
            reader => new PublicBrandingResponse(
                RawSql.ReadString(reader, "BrandName"),
                RawSql.ReadString(reader, "LogoUrl"),
                RawSql.ReadString(reader, "PrimaryColor", "#2563eb"),
                RawSql.ReadString(reader, "AccentColor", "#14b8a6"),
                RawSql.ReadString(reader, "SupportEmail"),
                RawSql.ReadString(reader, "CustomDomain"),
                RawSql.ReadBool(reader, "HideTradeLikeBranding")),
            cancellationToken,
            new SqlParam("@Host", host.Trim().ToLowerInvariant()));

        return profiles.FirstOrDefault() is { } profile ? Ok(profile) : NotFound();
    }

    private async Task<BrandingProfileResponse?> LoadTenantProfileAsync(int tenantId, CancellationToken cancellationToken)
    {
        var profiles = await RawSql.QueryAsync(
            _context,
            """
            SELECT TOP 1 [TenantId], [BrandName], [LogoUrl], [PrimaryColor], [AccentColor], [SupportEmail], [CustomDomain], [HideTradeLikeBranding], [UpdatedAtUtc]
            FROM [TenantBranding]
            WHERE [TenantId] = @TenantId
            """,
            reader => new BrandingProfileResponse(
                RawSql.ReadInt(reader, "TenantId"),
                RawSql.ReadString(reader, "BrandName"),
                RawSql.ReadString(reader, "LogoUrl"),
                RawSql.ReadString(reader, "PrimaryColor", "#2563eb"),
                RawSql.ReadString(reader, "AccentColor", "#14b8a6"),
                RawSql.ReadString(reader, "SupportEmail"),
                RawSql.ReadString(reader, "CustomDomain"),
                RawSql.ReadBool(reader, "HideTradeLikeBranding"),
                RawSql.ReadDateTime(reader, "UpdatedAtUtc") ?? DateTime.UtcNow),
            cancellationToken,
            new SqlParam("@TenantId", tenantId));

        return profiles.FirstOrDefault();
    }

    private static string? Validate(UpdateBrandingProfileRequest request)
    {
        if (request.BrandName.Trim().Length == 0)
        {
            return "Brand name is required.";
        }

        if (!IsHexColour(request.PrimaryColor) || !IsHexColour(request.AccentColor))
        {
            return "Primary and accent colours must be hex colours like #2563eb.";
        }

        if (!string.IsNullOrWhiteSpace(request.LogoUrl) &&
            !Uri.TryCreate(request.LogoUrl, UriKind.Absolute, out _))
        {
            return "Logo URL must be an absolute URL.";
        }

        return null;
    }

    private static bool IsHexColour(string value)
    {
        return value.Length == 7 &&
            value[0] == '#' &&
            value.Skip(1).All(Uri.IsHexDigit);
    }

    private static SqlParam[] BuildParameters(int tenantId, UpdateBrandingProfileRequest request)
    {
        return
        [
            new SqlParam("@TenantId", tenantId),
            new SqlParam("@BrandName", request.BrandName.Trim()),
            new SqlParam("@LogoUrl", Clean(request.LogoUrl)),
            new SqlParam("@PrimaryColor", request.PrimaryColor.Trim()),
            new SqlParam("@AccentColor", request.AccentColor.Trim()),
            new SqlParam("@SupportEmail", Clean(request.SupportEmail)),
            new SqlParam("@CustomDomain", Clean(request.CustomDomain)?.ToLowerInvariant()),
            new SqlParam("@HideTradeLikeBranding", request.HideTradeLikeBranding)
        ];
    }

    private static string? Clean(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }
}

public sealed record UpdateBrandingProfileRequest(
    string BrandName,
    string? LogoUrl,
    string PrimaryColor,
    string AccentColor,
    string? SupportEmail,
    string? CustomDomain,
    bool HideTradeLikeBranding);

public sealed record BrandingProfileResponse(
    int TenantId,
    string BrandName,
    string LogoUrl,
    string PrimaryColor,
    string AccentColor,
    string SupportEmail,
    string CustomDomain,
    bool HideTradeLikeBranding,
    DateTime UpdatedAtUtc)
{
    public static BrandingProfileResponse Default(int tenantId)
    {
        return new BrandingProfileResponse(
            tenantId,
            "TradeLike",
            string.Empty,
            "#2563eb",
            "#14b8a6",
            string.Empty,
            string.Empty,
            false,
            DateTime.UtcNow);
    }
}

public sealed record PublicBrandingResponse(
    string BrandName,
    string LogoUrl,
    string PrimaryColor,
    string AccentColor,
    string SupportEmail,
    string CustomDomain,
    bool HideTradeLikeBranding);
