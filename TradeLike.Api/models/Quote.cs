namespace TradeLike.Api.Models;

public class Quote
{
    public int Id { get; set; }

    public int CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal Amount { get; set; }

    public string Status { get; set; } = "Draft";

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}