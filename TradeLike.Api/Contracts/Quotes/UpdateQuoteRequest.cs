using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Contracts.Quotes;

public class UpdateQuoteRequest
{
    [Required]
    public int CustomerId { get; set; }

    [Required]
    [MaxLength(100)]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;

    [Range(0.01, 999999999)]
    public decimal Amount { get; set; }

    [Required]
    public string Status { get; set; } = "Draft";
}