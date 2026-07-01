using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Security;

namespace TradeLike.Api.Elastic;

[ApiController]
[Route("api/search")]
[Authorize(Policy = "RequireEmployeeRole")]
public sealed class SearchController : ControllerBase
{
    private readonly TradeLikeDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SearchController> _logger;

    public SearchController(
        TradeLikeDbContext db,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<SearchController> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<SearchResponse>> Search(
        [FromQuery] string? q,
        [FromQuery] string? types,
        [FromQuery] int take = 10,
        CancellationToken cancellationToken = default)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var query = (q ?? string.Empty).Trim();
        var requestedTypes = SearchTypeFilter.Parse(types);
        var resultLimit = Math.Clamp(take, 1, 25);

        if (query.Length == 0)
        {
            return Ok(new SearchResponse
            {
                Query = query,
                Types = requestedTypes.Order().ToArray(),
                ElasticPowered = false,
                Results = []
            });
        }

        var elasticClient = new ElasticSearchClient(
            _httpClientFactory.CreateClient(nameof(SearchController)),
            _configuration,
            _logger);

        var elasticAttempt = await elasticClient.TrySearchAsync(
            tenantId,
            query,
            requestedTypes,
            resultLimit,
            cancellationToken);

        if (elasticAttempt.Searched)
        {
            return Ok(new SearchResponse
            {
                Query = query,
                Types = requestedTypes.Order().ToArray(),
                ElasticPowered = true,
                Results = elasticAttempt.Results
            });
        }

        var fallbackResults = await SearchDatabaseAsync(
            tenantId,
            query,
            requestedTypes,
            resultLimit,
            cancellationToken);

        return Ok(new SearchResponse
        {
            Query = query,
            Types = requestedTypes.Order().ToArray(),
            ElasticPowered = false,
            Results = fallbackResults
        });
    }

    private async Task<IReadOnlyList<ElasticSearchResult>> SearchDatabaseAsync(
        int tenantId,
        string query,
        IReadOnlySet<string> types,
        int take,
        CancellationToken cancellationToken)
    {
        var documents = new List<ElasticSearchDocument>();

        if (types.Contains("customer"))
        {
            var customers = await _db.Customers
                .AsNoTracking()
                .Where(customer => customer.TenantId == tenantId)
                .Take(500)
                .ToListAsync(cancellationToken);

            documents.AddRange(customers.Select(ElasticDocumentFactory.FromCustomer));
        }

        if (types.Contains("job"))
        {
            var jobs = await _db.Jobs
                .AsNoTracking()
                .Where(job => job.TenantId == tenantId)
                .OrderByDescending(job => job.ScheduledDate)
                .Take(500)
                .ToListAsync(cancellationToken);

            documents.AddRange(jobs.Select(ElasticDocumentFactory.FromJob));
        }

        if (types.Contains("quote"))
        {
            var quotes = await _db.Quotes
                .AsNoTracking()
                .Include(quote => quote.LineItems)
                .Where(quote => quote.TenantId == tenantId)
                .OrderByDescending(quote => quote.CreatedAt)
                .Take(500)
                .ToListAsync(cancellationToken);

            documents.AddRange(quotes.Select(ElasticDocumentFactory.FromQuote));
        }

        return documents
            .Select(document => new
            {
                Document = document,
                Score = FuzzySearch.Score(document, query)
            })
            .Where(match => match.Score > 0)
            .OrderByDescending(match => match.Score)
            .ThenByDescending(match => match.Document.SortDate)
            .Take(take)
            .Select(match => ElasticDocumentFactory.ToResult(match.Document, match.Score))
            .ToList();
    }
}
