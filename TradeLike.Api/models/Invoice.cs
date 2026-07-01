using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public class Invoice
{
    public int Id { get; set; }

    [JsonIgnore]
    public int TenantId { get; set; }

    [Required]
    [MaxLength(40)]
    public string InvoiceNumber { get; set; } = string.Empty;

    public int? CustomerId { get; set; }

    public int? JobId { get; set; }

    public int? QuoteId { get; set; }

    [Required]
    [MaxLength(150)]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public int TotalPence { get; set; }

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Draft";

    public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(14);

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? PaidAt { get; set; }
}
