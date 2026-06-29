namespace TradeLike.Api.Contracts.Quotes;

public sealed record QuoteLineItemRequest(
    string Type,
    string Description,
    decimal Quantity,
    decimal UnitPrice,
    decimal VatRate
);