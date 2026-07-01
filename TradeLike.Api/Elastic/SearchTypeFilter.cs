namespace TradeLike.Api.Elastic;

public static class SearchTypeFilter
{
    public static readonly IReadOnlySet<string> All = new HashSet<string>(
        ["customer", "job", "quote"],
        StringComparer.OrdinalIgnoreCase);

    public static IReadOnlySet<string> Parse(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return All;
        }

        var parsed = value
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(Normalise)
            .Where(type => !string.IsNullOrWhiteSpace(type))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return parsed.Count == 0 ? All : parsed;
    }

    public static string Normalise(string value)
    {
        return value.Trim().ToLowerInvariant() switch
        {
            "customers" => "customer",
            "customer" => "customer",
            "jobs" => "job",
            "job" => "job",
            "quotes" => "quote",
            "quote" => "quote",
            "all" => string.Empty,
            _ => string.Empty
        };
    }
}
