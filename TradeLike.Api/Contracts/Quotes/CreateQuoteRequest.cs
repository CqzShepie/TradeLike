namespace TradeLike.Api.Contracts.Quotes;

public sealed record CreateQuoteRequest(
    int CustomerId,
    string CustomerName,
    string Title,
    string? Description,
    decimal Amount,
    string Status,
    tring? Notes
);