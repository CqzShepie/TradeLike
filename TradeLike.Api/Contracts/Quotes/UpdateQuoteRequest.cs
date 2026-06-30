namespace TradeLike.Api.Contracts.Quotes;

public sealed class UpdateQuoteRequest
{
    public int CustomerId { get; init; }

    public string CustomerName { get; init; } = string.Empty;

    public string Title { get; init; } = string.Empty;

    public string? Description { get; init; }

    public string DiscountType { get; init; } = "Amount";

    public decimal DiscountValue { get; init; }

    public decimal DiscountTotal { get; init; }

    public string Status { get; init; } = "Draft";

    public string? Notes { get; init; }

    public IReadOnlyList<QuoteLineItemRequest> LineItems { get; init; } =
        Array.Empty<QuoteLineItemRequest>();
}