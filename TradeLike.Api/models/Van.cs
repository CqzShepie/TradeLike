using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public class Van
{
    public int Id { get; set; }

    [JsonIgnore]
    public int TenantId { get; set; }

    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(40)]
    public string Registration { get; set; } = string.Empty;

    public int? EngineerId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<VanStock> Stock { get; set; } = [];
}
