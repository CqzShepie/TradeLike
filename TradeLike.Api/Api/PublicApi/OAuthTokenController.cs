using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TradeLike.Api.Configuration;
using TradeLike.Api.Data;

namespace TradeLike.Api.PublicApi;

[ApiController]
[AllowAnonymous]
[Route("api/oauth")]
public sealed class OAuthTokenController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly TradeLikeDbContext _context;
    private readonly JwtSettings _jwtSettings;

    public OAuthTokenController(
        TradeLikeDbContext context,
        IOptions<JwtSettings> jwtSettings)
    {
        _context = context;
        _jwtSettings = jwtSettings.Value;
    }

    [HttpPost("token")]
    public async Task<IActionResult> Token(CancellationToken cancellationToken)
    {
        var request = await ReadRequestAsync(cancellationToken);

        if (!string.Equals(request.GrantType, "client_credentials", StringComparison.Ordinal))
        {
            return BadRequest(new OAuthError("unsupported_grant_type", "Only client_credentials is supported."));
        }

        if (string.IsNullOrWhiteSpace(request.ClientId) || string.IsNullOrWhiteSpace(request.ClientSecret))
        {
            return Unauthorized(new OAuthError("invalid_client", "Client credentials are required."));
        }

        var clients = await RawSql.QueryAsync(
            _context,
            """
            SELECT TOP 1 [Id], [TenantId], [ClientId], [ClientSecretHash], [Name], [Scopes], [IsActive]
            FROM [ApiClients]
            WHERE [ClientId] = @ClientId
            """,
            reader => new ApiClientCredential(
                RawSql.ReadInt(reader, "Id"),
                RawSql.ReadInt(reader, "TenantId"),
                RawSql.ReadString(reader, "ClientId"),
                RawSql.ReadString(reader, "ClientSecretHash"),
                RawSql.ReadString(reader, "Name"),
                RawSql.ReadString(reader, "Scopes"),
                RawSql.ReadBool(reader, "IsActive")),
            cancellationToken,
            new SqlParam("@ClientId", request.ClientId.Trim()));

        var client = clients.FirstOrDefault();
        if (client is null || !client.IsActive || !BCrypt.Net.BCrypt.Verify(request.ClientSecret, client.ClientSecretHash))
        {
            return Unauthorized(new OAuthError("invalid_client", "Client credentials are invalid."));
        }

        var grantedScopes = ResolveScopes(client.Scopes, request.Scope);
        if (grantedScopes is null)
        {
            return BadRequest(new OAuthError("invalid_scope", "Requested scope is not allowed for this client."));
        }

        await RawSql.ExecuteAsync(
            _context,
            "UPDATE [ApiClients] SET [LastUsedAtUtc] = SYSUTCDATETIME() WHERE [Id] = @Id",
            cancellationToken,
            new SqlParam("@Id", client.Id));

        var token = CreateToken(client, grantedScopes);

        return Ok(new
        {
            access_token = token,
            token_type = "Bearer",
            expires_in = _jwtSettings.ExpiryMinutes * 60,
            scope = grantedScopes
        });
    }

    private async Task<OAuthTokenRequest> ReadRequestAsync(CancellationToken cancellationToken)
    {
        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync(cancellationToken);
            return new OAuthTokenRequest(
                form["grant_type"].ToString(),
                form["client_id"].ToString(),
                form["client_secret"].ToString(),
                form["scope"].ToString());
        }

        var request = await JsonSerializer.DeserializeAsync<OAuthTokenRequest>(
            Request.Body,
            JsonOptions,
            cancellationToken);

        return request ?? new OAuthTokenRequest(null, null, null, null);
    }

    private string CreateToken(ApiClientCredential client, string scopes)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, client.ClientId),
            new Claim(ClaimTypes.NameIdentifier, client.Id.ToString()),
            new Claim(ClaimTypes.Name, client.Name),
            new Claim(ClaimTypes.Role, PublicApiConstants.ClientRole),
            new Claim("role", PublicApiConstants.ClientRole),
            new Claim("tid", client.TenantId.ToString()),
            new Claim("client_id", client.ClientId),
            new Claim("scope", scopes),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Key));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string? ResolveScopes(string allowedScopes, string? requestedScopes)
    {
        var allowed = SplitScopes(allowedScopes).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var requested = SplitScopes(requestedScopes);

        if (requested.Count == 0)
        {
            requested = allowed.OrderBy(scope => scope, StringComparer.OrdinalIgnoreCase).ToList();
        }

        return requested.All(allowed.Contains)
            ? string.Join(' ', requested.Distinct(StringComparer.OrdinalIgnoreCase))
            : null;
    }

    private static List<string> SplitScopes(string? scopes)
    {
        return (scopes ?? string.Empty)
            .Split([' ', ',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();
    }

    private sealed record OAuthTokenRequest(
        string? GrantType,
        string? ClientId,
        string? ClientSecret,
        string? Scope);

    private sealed record OAuthError(string Error, string ErrorDescription);

    private sealed record ApiClientCredential(
        int Id,
        int TenantId,
        string ClientId,
        string ClientSecretHash,
        string Name,
        string Scopes,
        bool IsActive);
}
