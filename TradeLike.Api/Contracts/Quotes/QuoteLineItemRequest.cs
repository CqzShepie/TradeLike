namespace TradeLike.Api.Contracts.Quotes;

public sealed class QuoteLineItemRequest
{
    public string Type { get; init; } = "Labour";

    public string Description { get; init; } = string.Empty;

    public decimal Quantity { get; init; } = 1;

    public decimal UnitPrice { get; init; }

    public decimal VatRate { get; init; } = 20;
}