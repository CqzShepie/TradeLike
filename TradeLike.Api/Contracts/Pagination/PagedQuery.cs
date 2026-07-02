namespace TradeLike.Api.Contracts.Pagination;

public sealed class PagedQuery
{
    public const int DefaultPageSize = 25;
    public const int MaximumPageSize = 100;

    public int Page { get; init; } = 1;

    public int PageSize { get; init; } = DefaultPageSize;

    public string? Search { get; init; }

    public string? SortBy { get; init; }

    public string? SortDirection { get; init; }

    public string? Status { get; init; }

    public DateTime? DateFrom { get; init; }

    public DateTime? DateTo { get; init; }

    public int NormalizedPage => Page < 1 ? 1 : Page;

    public int NormalizedPageSize => PageSize switch
    {
        < 1 => DefaultPageSize,
        > MaximumPageSize => MaximumPageSize,
        _ => PageSize
    };

    public bool SortDescending =>
        string.Equals(SortDirection, "desc", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(SortDirection, "descending", StringComparison.OrdinalIgnoreCase);
}
