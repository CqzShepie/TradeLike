using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Integrations;

[ApiController]
[Authorize(Policy = "RequireDirectorRole")]
[Route("api/integrations")]
public sealed class AccountingIntegrationsController : ControllerBase
{
    private readonly TradeLikeDbContext _context;
    private readonly IConfiguration _configuration;

    public AccountingIntegrationsController(TradeLikeDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpGet("{provider}/connect")]
    public ActionResult<ConnectResponse> Connect(AccountingProvider provider)
    {
        var clientId = GetClientId(provider);
        if (string.IsNullOrWhiteSpace(clientId))
        {
            return BadRequest(new { error = $"{provider} client id is not configured." });
        }

        var callbackUrl = Url.ActionLink(action: nameof(Callback), values: new { provider });
        var authorizationUrl = provider == AccountingProvider.Xero
            ? $"https://login.xero.com/identity/connect/authorize?response_type=code&client_id={Uri.EscapeDataString(clientId)}&redirect_uri={Uri.EscapeDataString(callbackUrl ?? string.Empty)}&scope=openid%20profile%20email%20accounting.transactions"
            : $"https://appcenter.intuit.com/connect/oauth2?response_type=code&client_id={Uri.EscapeDataString(clientId)}&redirect_uri={Uri.EscapeDataString(callbackUrl ?? string.Empty)}&scope=com.intuit.quickbooks.accounting";

        return Ok(new ConnectResponse(provider.ToString(), authorizationUrl));
    }

    [HttpGet("{provider}/callback")]
    public async Task<ActionResult<IntegrationStatusResponse>> Callback(
        AccountingProvider provider,
        [FromQuery] string? code,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return BadRequest(new { error = "OAuth code is required." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var token = await _context.AccountingTokens
            .FirstOrDefaultAsync(item => item.TenantId == tenantId && item.Provider == provider, cancellationToken);

        if (token is null)
        {
            token = new AccountingToken
            {
                TenantId = tenantId,
                Provider = provider,
                CreatedAtUtc = DateTime.UtcNow
            };
            _context.AccountingTokens.Add(token);
        }

        token.AccessToken = $"{provider.ToString().ToLowerInvariant()}-access-{code}";
        token.RefreshToken = $"{provider.ToString().ToLowerInvariant()}-refresh-{code}";
        token.ExpiresUtc = DateTime.UtcNow.AddHours(1);

        _context.AccountingSyncLogs.Add(new AccountingSyncLog
        {
            TenantId = tenantId,
            Provider = provider,
            Direction = "OAuth",
            Status = "Connected",
            DetailsJson = "{}",
            CreatedAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new IntegrationStatusResponse(provider.ToString(), true, null, token.ExpiresUtc, true));
    }

    [HttpPost("{provider}/disconnect")]
    public async Task<IActionResult> Disconnect(AccountingProvider provider, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var tokens = await _context.AccountingTokens
            .Where(item => item.TenantId == tenantId && item.Provider == provider)
            .ToListAsync(cancellationToken);

        _context.AccountingTokens.RemoveRange(tokens);
        _context.AccountingSyncLogs.Add(new AccountingSyncLog
        {
            TenantId = tenantId,
            Provider = provider,
            Direction = "OAuth",
            Status = "Disconnected",
            DetailsJson = "{}",
            CreatedAtUtc = DateTime.UtcNow
        });
        await _context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("status")]
    public async Task<ActionResult<IReadOnlyList<IntegrationStatusResponse>>> Status(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var tokens = await _context.AccountingTokens
            .AsNoTracking()
            .Where(item => item.TenantId == tenantId)
            .ToListAsync(cancellationToken);
        var logs = await _context.AccountingSyncLogs
            .AsNoTracking()
            .Where(item => item.TenantId == tenantId)
            .GroupBy(item => item.Provider)
            .Select(group => new { Provider = group.Key, LastSync = group.Max(item => item.CreatedAtUtc) })
            .ToListAsync(cancellationToken);

        var response = Enum.GetValues<AccountingProvider>()
            .Select(provider =>
            {
                var token = tokens.FirstOrDefault(item => item.Provider == provider);
                var lastSync = logs.FirstOrDefault(item => item.Provider == provider)?.LastSync;
                return new IntegrationStatusResponse(provider.ToString(), token is not null, lastSync, token?.ExpiresUtc, true);
            })
            .ToList();

        return Ok(response);
    }

    private string? GetClientId(AccountingProvider provider)
    {
        return provider switch
        {
            AccountingProvider.Xero => _configuration["XERO_CLIENT_ID"] ?? Environment.GetEnvironmentVariable("XERO_CLIENT_ID"),
            AccountingProvider.QuickBooks => _configuration["QUICKBOOKS_CLIENT_ID"] ?? Environment.GetEnvironmentVariable("QUICKBOOKS_CLIENT_ID"),
            _ => null
        };
    }
}

public sealed record ConnectResponse(string Provider, string AuthorizationUrl);

public sealed record IntegrationStatusResponse(
    string Provider,
    bool Connected,
    DateTime? LastSyncAtUtc,
    DateTime? ExpiresUtc,
    bool AutoSyncEnabled);
