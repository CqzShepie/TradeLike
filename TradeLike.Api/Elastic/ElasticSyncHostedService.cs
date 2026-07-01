using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;

namespace TradeLike.Api.Elastic;

public sealed class ElasticSyncHostedService : BackgroundService
{
    private const int BatchSize = 500;
    private static readonly TimeSpan SyncPeriod = TimeSpan.FromMinutes(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ElasticSyncHostedService> _logger;
    private readonly ConcurrentDictionary<string, string> _versions = new();

    public ElasticSyncHostedService(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<ElasticSyncHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var client = new ElasticSearchClient(
            _httpClientFactory.CreateClient(nameof(ElasticSyncHostedService)),
            _configuration,
            _logger);

        if (!client.IsConfigured)
        {
            _logger.LogInformation("Elasticsearch sync is disabled because ELASTIC_URI or ELASTIC_API_KEY is missing.");
            return;
        }

        await IndexOnceAsync(client, stoppingToken);

        using var timer = new PeriodicTimer(SyncPeriod);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await IndexOnceAsync(client, stoppingToken);
        }
    }

    private async Task IndexOnceAsync(ElasticSearchClient client, CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<TradeLikeDbContext>();

            var indexed = 0;
            indexed += await IndexCustomersAsync(db, client, cancellationToken);
            indexed += await IndexJobsAsync(db, client, cancellationToken);
            indexed += await IndexQuotesAsync(db, client, cancellationToken);

            if (indexed > 0)
            {
                _logger.LogInformation("Indexed {DocumentCount} changed search documents.", indexed);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Elasticsearch sync failed.");
        }
    }

    private async Task<int> IndexCustomersAsync(
        TradeLikeDbContext db,
        ElasticSearchClient client,
        CancellationToken cancellationToken)
    {
        var indexed = 0;
        var offset = 0;

        while (true)
        {
            var customers = await db.Customers
                .AsNoTracking()
                .OrderBy(customer => customer.Id)
                .Skip(offset)
                .Take(BatchSize)
                .ToListAsync(cancellationToken);

            if (customers.Count == 0)
            {
                return indexed;
            }

            indexed += await IndexChangedAsync(
                customers.Select(ElasticDocumentFactory.FromCustomer),
                client,
                cancellationToken);

            offset += customers.Count;
        }
    }

    private async Task<int> IndexJobsAsync(
        TradeLikeDbContext db,
        ElasticSearchClient client,
        CancellationToken cancellationToken)
    {
        var indexed = 0;
        var offset = 0;

        while (true)
        {
            var jobs = await db.Jobs
                .AsNoTracking()
                .OrderBy(job => job.Id)
                .Skip(offset)
                .Take(BatchSize)
                .ToListAsync(cancellationToken);

            if (jobs.Count == 0)
            {
                return indexed;
            }

            indexed += await IndexChangedAsync(
                jobs.Select(ElasticDocumentFactory.FromJob),
                client,
                cancellationToken);

            offset += jobs.Count;
        }
    }

    private async Task<int> IndexQuotesAsync(
        TradeLikeDbContext db,
        ElasticSearchClient client,
        CancellationToken cancellationToken)
    {
        var indexed = 0;
        var offset = 0;

        while (true)
        {
            var quotes = await db.Quotes
                .AsNoTracking()
                .Include(quote => quote.LineItems)
                .OrderBy(quote => quote.Id)
                .Skip(offset)
                .Take(BatchSize)
                .ToListAsync(cancellationToken);

            if (quotes.Count == 0)
            {
                return indexed;
            }

            indexed += await IndexChangedAsync(
                quotes.Select(ElasticDocumentFactory.FromQuote),
                client,
                cancellationToken);

            offset += quotes.Count;
        }
    }

    private async Task<int> IndexChangedAsync(
        IEnumerable<ElasticSearchDocument> documents,
        ElasticSearchClient client,
        CancellationToken cancellationToken)
    {
        var changedDocuments = new List<ElasticSearchDocument>();

        foreach (var document in documents)
        {
            if (_versions.TryGetValue(document.DocumentId, out var existingVersion) &&
                string.Equals(existingVersion, document.Version, StringComparison.Ordinal))
            {
                continue;
            }

            _versions[document.DocumentId] = document.Version;
            changedDocuments.Add(document);
        }

        return await client.BulkIndexAsync(changedDocuments, cancellationToken);
    }
}
