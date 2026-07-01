using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TradeLike.Api.Elastic;

public sealed class ElasticSearchClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly HttpClient _httpClient;
    private readonly ILogger _logger;
    private readonly Uri? _baseUri;
    private readonly string? _apiKey;
    private readonly string _indexName;

    public ElasticSearchClient(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["ELASTIC_API_KEY"];
        _indexName = configuration["ELASTIC_INDEX"] ?? "tradelike-search";

        var uri = configuration["ELASTIC_URI"];
        if (Uri.TryCreate(uri?.TrimEnd('/') + "/", UriKind.Absolute, out var baseUri))
        {
            _baseUri = baseUri;
        }
    }

    public bool IsConfigured =>
        _baseUri is not null &&
        !string.IsNullOrWhiteSpace(_apiKey) &&
        !string.IsNullOrWhiteSpace(_indexName);

    public async Task<ElasticSearchAttempt> TrySearchAsync(
        int tenantId,
        string query,
        IReadOnlySet<string> types,
        int take,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured)
        {
            return ElasticSearchAttempt.NotSearched;
        }

        try
        {
            using var request = CreateRequest(HttpMethod.Post, $"{Uri.EscapeDataString(_indexName)}/_search");
            request.Content = JsonContent(CreateSearchPayload(tenantId, query, types, take));

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseText = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Elasticsearch search failed with status {StatusCode}: {Response}",
                    (int)response.StatusCode,
                    responseText);

                return ElasticSearchAttempt.NotSearched;
            }

            return new ElasticSearchAttempt(true, ParseSearchResults(responseText));
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LogWarning(ex, "Elasticsearch search is unavailable.");
            return ElasticSearchAttempt.NotSearched;
        }
    }

    public async Task<int> BulkIndexAsync(
        IEnumerable<ElasticSearchDocument> documents,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured)
        {
            return 0;
        }

        var documentList = documents.ToList();
        if (documentList.Count == 0)
        {
            return 0;
        }

        var payload = new StringBuilder();

        foreach (var document in documentList)
        {
            payload.AppendLine(JsonSerializer.Serialize(new
            {
                index = new
                {
                    _index = _indexName,
                    _id = document.DocumentId
                }
            }, JsonOptions));
            payload.AppendLine(JsonSerializer.Serialize(document, JsonOptions));
        }

        using var request = CreateRequest(HttpMethod.Post, "_bulk");
        request.Content = new StringContent(payload.ToString(), Encoding.UTF8, "application/x-ndjson");

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var responseText = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Elasticsearch bulk index failed with status {StatusCode}: {Response}",
                (int)response.StatusCode,
                responseText);

            return 0;
        }

        if (BulkResponseHasErrors(responseText))
        {
            _logger.LogWarning("Elasticsearch bulk index completed with item errors: {Response}", responseText);
        }

        return documentList.Count;
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string relativePath)
    {
        var request = new HttpRequestMessage(method, new Uri(_baseUri!, relativePath.TrimStart('/')));
        request.Headers.Authorization = new AuthenticationHeaderValue("ApiKey", _apiKey);

        return request;
    }

    private static StringContent JsonContent(object payload)
    {
        return new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");
    }

    private static object CreateSearchPayload(
        int tenantId,
        string query,
        IReadOnlySet<string> types,
        int take)
    {
        var filters = new List<object>
        {
            new Dictionary<string, object>
            {
                ["term"] = new Dictionary<string, object>
                {
                    ["tenantId"] = tenantId
                }
            }
        };

        if (types.Count > 0 && types.Count < SearchTypeFilter.All.Count)
        {
            filters.Add(new Dictionary<string, object>
            {
                ["terms"] = new Dictionary<string, object>
                {
                    ["type"] = types.ToArray()
                }
            });
        }

        var mustQuery = string.IsNullOrWhiteSpace(query)
            ? new Dictionary<string, object> { ["match_all"] = new { } }
            : new Dictionary<string, object>
            {
                ["multi_match"] = new Dictionary<string, object>
                {
                    ["query"] = query,
                    ["fields"] = new[] { "title^4", "subtitle^2", "body", "keywords" },
                    ["fuzziness"] = "AUTO",
                    ["operator"] = "and"
                }
            };

        return new Dictionary<string, object>
        {
            ["size"] = Math.Clamp(take, 1, 50),
            ["query"] = new Dictionary<string, object>
            {
                ["bool"] = new Dictionary<string, object>
                {
                    ["filter"] = filters,
                    ["must"] = new[] { mustQuery }
                }
            },
            ["sort"] = new object[]
            {
                new Dictionary<string, object> { ["_score"] = "desc" },
                new Dictionary<string, object> { ["sortDate"] = new { order = "desc", missing = "_last" } }
            }
        };
    }

    private static IReadOnlyList<ElasticSearchResult> ParseSearchResults(string responseText)
    {
        using var document = JsonDocument.Parse(responseText);

        if (!document.RootElement.TryGetProperty("hits", out var hits) ||
            !hits.TryGetProperty("hits", out var hitArray) ||
            hitArray.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var results = new List<ElasticSearchResult>();

        foreach (var hit in hitArray.EnumerateArray())
        {
            if (!hit.TryGetProperty("_source", out var source))
            {
                continue;
            }

            results.Add(new ElasticSearchResult
            {
                Type = ReadString(source, "type"),
                Id = ReadInt(source, "entityId"),
                Title = ReadString(source, "title"),
                Subtitle = ReadString(source, "subtitle"),
                Body = ReadString(source, "body"),
                Url = ReadString(source, "url"),
                SortDate = ReadDateTimeOffset(source, "sortDate"),
                Score = hit.TryGetProperty("_score", out var score) && score.TryGetDouble(out var value)
                    ? value
                    : 0
            });
        }

        return results;
    }

    private static bool BulkResponseHasErrors(string responseText)
    {
        try
        {
            using var document = JsonDocument.Parse(responseText);

            return document.RootElement.TryGetProperty("errors", out var errors) &&
                errors.ValueKind == JsonValueKind.True;
        }
        catch (JsonException)
        {
            return true;
        }
    }

    private static string ReadString(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.String
            ? property.GetString() ?? string.Empty
            : string.Empty;
    }

    private static int ReadInt(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var property))
        {
            return 0;
        }

        if (property.ValueKind == JsonValueKind.Number && property.TryGetInt32(out var number))
        {
            return number;
        }

        return property.ValueKind == JsonValueKind.String &&
            int.TryParse(property.GetString(), out var parsed)
            ? parsed
            : 0;
    }

    private static DateTimeOffset? ReadDateTimeOffset(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var property) &&
            property.ValueKind == JsonValueKind.String &&
            DateTimeOffset.TryParse(property.GetString(), out var parsed)
                ? parsed
                : null;
    }
}

public sealed record ElasticSearchAttempt(
    bool Searched,
    IReadOnlyList<ElasticSearchResult> Results)
{
    public static ElasticSearchAttempt NotSearched { get; } = new(false, []);
}
