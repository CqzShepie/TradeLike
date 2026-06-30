namespace TradeLike.Api.Contracts.Quotes;

public sealed class ConvertQuoteToJobRequest
{
    public string JobTitle { get; init; } = string.Empty;

    public DateTime ScheduledDate { get; init; }

    public string? Phone { get; init; }

    public string? Address { get; init; }

    public string Priority { get; init; } = "Normal";

    public string? Notes { get; init; }

    public int? EngineerId { get; init; }
}