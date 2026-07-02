using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public class Customer
{
    public int Id { get; set; }

    [JsonIgnore]
    public int TenantId { get; set; }

    [Required]
    [MaxLength(180)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(40)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Address { get; set; } = string.Empty;

    [MaxLength(4000)]
    public string? Notes { get; set; }
}
