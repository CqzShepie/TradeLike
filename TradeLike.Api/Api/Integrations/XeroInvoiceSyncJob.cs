using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Api.Integrations;

public sealed class XeroInvoiceSyncJob
{
    private readonly AccountingIntegrationService _service;

    public XeroInvoiceSyncJob(TradeLikeDbContext context)
    {
        _service = new AccountingIntegrationService(context, new PlaceholderAccountingProviderClient());
    }

    public Task<int> RunAsync(int tenantId, CancellationToken cancellationToken = default)
    {
        return _service.SyncInvoicesAsync(tenantId, AccountingProvider.Xero, cancellationToken);
    }
}
