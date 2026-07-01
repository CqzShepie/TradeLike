using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public class Product
{
    public int Id { get; set; }

    [JsonIgnore]
    public int TenantId { get; set; }

    [Required]
    [MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(60)]
    public string Sku { get; set; } = string.Empty;
}
