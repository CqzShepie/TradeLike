using System.Text.Json.Serialization;

namespace TradeLike.Api.Elastic;

public sealed class ElasticSearchDocument
{
    public string DocumentId { get; init; } = string.Empty;

    public int TenantId { get; init; }

    public string Type { get; init; } = string.Empty;

    public int EntityId { get; init; }

    public string Title { get; init; } = string.Empty;

    public string Subtitle { get; init; } = string.Empty;

    public string Body { get; init; } = string.Empty;

    public IReadOnlyList<string> Keywords { get; init; } = [];

    public string Url { get; init; } = string.Empty;

    public DateTimeOffset? SortDate { get; init; }

    public string Version { get; init; } = string.Empty;

    [JsonIgnore]
    public string SearchText => string.Join(
        ' ',
        new[] { Title, Subtitle, Body }.Concat(Keywords).Where(value => !string.IsNullOrWhiteSpace(value)));
}

public sealed class ElasticSearchResult
{
    public string Type { get; init; } = string.Empty;

    public int Id { get; init; }

    public string Title { get; init; } = string.Empty;

    public string Subtitle { get; init; } = string.Empty;

    public string Body { get; init; } = string.Empty;

    public string Url { get; init; } = string.Empty;

    public DateTimeOffset? SortDate { get; init; }

    public double Score { get; init; }
}

public sealed class SearchResponse
{
    public string Query { get; init; } = string.Empty;

    public IReadOnlyList<string> Types { get; init; } = [];

    public bool ElasticPowered { get; init; }

    public IReadOnlyList<ElasticSearchResult> Results { get; init; } = [];
}
