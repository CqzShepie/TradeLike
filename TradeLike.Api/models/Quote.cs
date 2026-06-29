using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class Quote
{
    public int Id { get; set; }

    public int CustomerId { get; set; }

    [Required]
    [MaxLength(150)]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(4000)]
    public string? Description { get; set; }

    public decimal Amount { get; set; }

    public decimal Subtotal { get; set; }

    public decimal VatTotal { get; set; }

    public decimal DiscountTotal { get; set; }

    public decimal Total { get; set; }

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Draft";

    [MaxLength(4000)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<QuoteLineItem> LineItems { get; set; } = new();
}