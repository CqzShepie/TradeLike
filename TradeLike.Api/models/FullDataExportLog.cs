using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public class FullDataExportLog
{
    public int Id { get; set; }

    [JsonIgnore]
    public int TenantId { get; set; }

    public int RequestedById { get; set; }

    [Required]
    [MaxLength(20)]
    public string PlanName { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
