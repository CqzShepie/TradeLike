using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Data;
using TradeLike.Api.Security;

namespace TradeLike.Api.PublicApi;

[ApiController]
[Authorize(Policy = "RequireDirectorRole")]
[Route("api/public-api/clients")]
public sealed class ApiClientsController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public ApiClientsController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<ApiClientResponse>>> List(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);

        var clients = await RawSql.QueryAsync(
            _context,
            """
            SELECT [Id], [ClientId], [Name], [Scopes], [IsActive], [CreatedAtUtc], [LastUsedAtUtc]
            FROM [ApiClients]
            WHERE [TenantId] = @TenantId
            ORDER BY [CreatedAtUtc] DESC
            """,
            reader => new ApiClientResponse(
                RawSql.ReadInt(reader, "Id"),
                RawSql.ReadString(reader, "ClientId"),
                RawSql.ReadString(reader, "Name"),
                SplitScopes(RawSql.ReadString(reader, "Scopes")),
                RawSql.ReadBool(reader, "IsActive"),
                RawSql.ReadDateTime(reader, "CreatedAtUtc") ?? DateTime.UtcNow,
                RawSql.ReadDateTime(reader, "LastUsedAtUtc")),
            cancellationToken,
            new SqlParam("@TenantId", tenantId));

        return Ok(clients);
    }

    [HttpPost]
    public async Task<ActionResult<CreateApiClientResponse>> Create(
        [FromBody] CreateApiClientRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var name = request.Name.Trim();

        if (name.Length == 0)
        {
            return BadRequest(new { error = "Client name is required." });
        }

        var scopes = ResolveScopes(request.Scopes);
        var clientId = $"tl_{RandomHex(12).ToLowerInvariant()}";
        var clientSecret = $"tl_secret_{RandomHex(32).ToLowerInvariant()}";
        var secretHash = BCrypt.Net.BCrypt.HashPassword(clientSecret);

        var id = await RawSql.ScalarAsync(
            _context,
            """
            INSERT INTO [ApiClients] ([TenantId], [ClientId], [ClientSecretHash], [Name], [Scopes], [IsActive], [CreatedAtUtc])
            OUTPUT INSERTED.[Id]
            VALUES (@TenantId, @ClientId, @ClientSecretHash, @Name, @Scopes, 1, SYSUTCDATETIME())
            """,
            cancellationToken,
            new SqlParam("@TenantId", tenantId),
            new SqlParam("@ClientId", clientId),
            new SqlParam("@ClientSecretHash", secretHash),
            new SqlParam("@Name", name),
            new SqlParam("@Scopes", string.Join(' ', scopes)));

        return CreatedAtAction(
            nameof(List),
            new CreateApiClientResponse(
                Convert.ToInt32(id),
                clientId,
                clientSecret,
                name,
                scopes,
                true,
                DateTime.UtcNow));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Revoke(int id, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);

        var affected = await RawSql.ExecuteAsync(
            _context,
            """
            UPDATE [ApiClients]
            SET [IsActive] = 0
            WHERE [Id] = @Id AND [TenantId] = @TenantId
            """,
            cancellationToken,
            new SqlParam("@Id", id),
            new SqlParam("@TenantId", tenantId));

        return affected == 0 ? NotFound() : NoContent();
    }

    private static string RandomHex(int byteCount)
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(byteCount));
    }

    private static string[] ResolveScopes(IReadOnlyCollection<string>? requestedScopes)
    {
        if (requestedScopes is null || requestedScopes.Count == 0)
        {
            return PublicApiConstants.DefaultScopes;
        }

        var supported = PublicApiConstants.DefaultScopes.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return requestedScopes
            .Select(scope => scope.Trim())
            .Where(scope => scope.Length > 0 && supported.Contains(scope))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .DefaultIfEmpty(PublicApiConstants.DefaultScopes[0])
            .ToArray();
    }

    private static string[] SplitScopes(string scopes)
    {
        return scopes
            .Split([' ', ',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }
}

public sealed record CreateApiClientRequest(string Name, IReadOnlyCollection<string>? Scopes);

public sealed record ApiClientResponse(
    int Id,
    string ClientId,
    string Name,
    IReadOnlyCollection<string> Scopes,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime? LastUsedAtUtc);

public sealed record CreateApiClientResponse(
    int Id,
    string ClientId,
    string ClientSecret,
    string Name,
    IReadOnlyCollection<string> Scopes,
    bool IsActive,
    DateTime CreatedAtUtc);
