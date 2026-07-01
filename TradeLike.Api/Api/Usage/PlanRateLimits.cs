namespace TradeLike.Api.Api.Usage;

public sealed record PlanRateLimit(
    string Plan,
    int RequestsPerSecond,
    int? DailyRequestLimit);

public static class PlanRateLimits
{
    public static readonly IReadOnlyDictionary<string, PlanRateLimit> ByPlan =
        new Dictionary<string, PlanRateLimit>(StringComparer.OrdinalIgnoreCase)
        {
            ["Solo"] = new("Solo", 2, 1000),
            ["Team"] = new("Team", 5, 10000),
            ["Business"] = new("Business", 10, 50000),
            ["Enterprise"] = new("Enterprise", 20, null)
        };

    public static PlanRateLimit Resolve(string? plan)
    {
        return !string.IsNullOrWhiteSpace(plan) && ByPlan.TryGetValue(plan, out var limit)
            ? limit
            : ByPlan["Solo"];
    }
}
