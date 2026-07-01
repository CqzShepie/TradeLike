using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public class QuoteLineItem
{
    public int Id { get; set; }

    [JsonIgnore]
    public int TenantId { get; set; }

    public int QuoteId { get; set; }

    [JsonIgnore]
    public Quote? Quote { get; set; }

    [Required]
    [MaxLength(30)]
    public string Type { get; set; } = "Labour";

    [Required]
    [MaxLength(250)]
    public string Description { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    public decimal UnitPrice { get; set; }

    public decimal VatRate { get; set; } = 20;

    public decimal LineTotal { get; set; }
}
