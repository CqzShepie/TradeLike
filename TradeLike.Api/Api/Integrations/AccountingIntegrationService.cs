using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Api.Integrations;

public interface IAccountingProviderClient
{
    Task<AccountingTokenPair> RefreshAsync(AccountingToken token, CancellationToken cancellationToken);

    Task PushPaidInvoicesAsync(AccountingToken token, IReadOnlyList<Invoice> invoices, CancellationToken cancellationToken);

    Task<IReadOnlyDictionary<int, string>> PullPaymentStatusesAsync(AccountingToken token, CancellationToken cancellationToken);
}

public sealed class PlaceholderAccountingProviderClient : IAccountingProviderClient
{
    public int RefreshCallCount { get; private set; }

    public Task<AccountingTokenPair> RefreshAsync(AccountingToken token, CancellationToken cancellationToken)
    {
        RefreshCallCount++;
        return Task.FromResult(new AccountingTokenPair(
            $"{token.Provider.ToString().ToLowerInvariant()}-access-{Guid.NewGuid():N}",
            $"{token.Provider.ToString().ToLowerInvariant()}-refresh-{Guid.NewGuid():N}",
            DateTime.UtcNow.AddHours(1)));
    }

    public Task PushPaidInvoicesAsync(AccountingToken token, IReadOnlyList<Invoice> invoices, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    public Task<IReadOnlyDictionary<int, string>> PullPaymentStatusesAsync(AccountingToken token, CancellationToken cancellationToken)
    {
        return Task.FromResult<IReadOnlyDictionary<int, string>>(new Dictionary<int, string>());
    }
}

public sealed class AccountingIntegrationService
{
    private readonly TradeLikeDbContext _context;
    private readonly IAccountingProviderClient _client;

    public AccountingIntegrationService(TradeLikeDbContext context, IAccountingProviderClient client)
    {
        _context = context;
        _client = client;
    }

    public async Task<AccountingToken?> EnsureFreshTokenAsync(
        int tenantId,
        AccountingProvider provider,
        CancellationToken cancellationToken)
    {
        var token = await _context.AccountingTokens
            .FirstOrDefaultAsync(item => item.TenantId == tenantId && item.Provider == provider, cancellationToken);

        if (token is null)
        {
            return null;
        }

        if (token.ExpiresUtc > DateTime.UtcNow.AddMinutes(5))
        {
            return token;
        }

        var refreshed = await _client.RefreshAsync(token, cancellationToken);
        token.AccessToken = refreshed.AccessToken;
        token.RefreshToken = refreshed.RefreshToken;
        token.ExpiresUtc = refreshed.ExpiresUtc;
        await _context.SaveChangesAsync(cancellationToken);
        return token;
    }

    public async Task<int> SyncInvoicesAsync(
        int tenantId,
        AccountingProvider provider,
        CancellationToken cancellationToken)
    {
        var token = await EnsureFreshTokenAsync(tenantId, provider, cancellationToken);
        if (token is null)
        {
            return 0;
        }

        var paidInvoices = await _context.Invoices
            .AsNoTracking()
            .Where(invoice => invoice.TenantId == tenantId && invoice.Status == "Paid")
            .OrderByDescending(invoice => invoice.PaidAt ?? invoice.CreatedAt)
            .Take(200)
            .ToListAsync(cancellationToken);

        await _client.PushPaidInvoicesAsync(token, paidInvoices, cancellationToken);
        var statusUpdates = await _client.PullPaymentStatusesAsync(token, cancellationToken);
        foreach (var update in statusUpdates)
        {
            var invoice = await _context.Invoices
                .FirstOrDefaultAsync(item => item.TenantId == tenantId && item.Id == update.Key, cancellationToken);
            if (invoice is not null)
            {
                invoice.Status = update.Value;
                invoice.PaidAt = string.Equals(update.Value, "Paid", StringComparison.OrdinalIgnoreCase)
                    ? DateTime.UtcNow
                    : invoice.PaidAt;
            }
        }

        _context.AccountingSyncLogs.Add(new AccountingSyncLog
        {
            TenantId = tenantId,
            Provider = provider,
            Direction = "Both",
            Status = "Success",
            DetailsJson = JsonSerializer.Serialize(new { pushed = paidInvoices.Count, pulled = statusUpdates.Count }),
            CreatedAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);
        return paidInvoices.Count + statusUpdates.Count;
    }
}

public sealed record AccountingTokenPair(string AccessToken, string RefreshToken, DateTime ExpiresUtc);
