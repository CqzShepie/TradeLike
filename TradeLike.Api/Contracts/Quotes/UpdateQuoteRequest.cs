namespace TradeLike.Api.Contracts.Quotes;

public sealed record UpdateQuoteRequest(
    int CustomerId,
    string CustomerName,
    string Title,
    string? Description,
    decimal Amount,
    string Status
);