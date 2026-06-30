namespace TradeLike.Api.Contracts.Quotes;

public sealed class QuoteResponse
{
    public int Id { get; init; }

    public int CustomerId { get; init; }

    public string CustomerName { get; init; } = string.Empty;

    public string Title { get; init; } = string.Empty;

    public string? Description { get; init; }

    public decimal Amount { get; init; }

    public decimal Subtotal { get; init; }

    public decimal VatTotal { get; init; }

    public string DiscountType { get; init; } = "Amount";

    public decimal DiscountValue { get; init; }

    public decimal DiscountTotal { get; init; }

    public decimal Total { get; init; }

    public string Status { get; init; } = string.Empty;

    public string? Notes { get; init; }

    public DateTime CreatedAt { get; init; }

    public IReadOnlyList<QuoteLineItemResponse> LineItems { get; init; } =
        Array.Empty<QuoteLineItemResponse>();
}

public sealed class QuoteLineItemResponse
{
    public int Id { get; init; }

    public int QuoteId { get; init; }

    public string Type { get; init; } = string.Empty;

    public string Description { get; init; } = string.Empty;

    public decimal Quantity { get; init; }

    public decimal UnitPrice { get; init; }

    public decimal VatRate { get; init; }

    public decimal LineTotal { get; init; }
}