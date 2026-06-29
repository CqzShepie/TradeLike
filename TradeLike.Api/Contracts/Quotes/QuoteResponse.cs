namespace TradeLike.Api.Contracts.Quotes;

public class QuoteResponse
{
    public int Id { get; set; }

    public int CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}