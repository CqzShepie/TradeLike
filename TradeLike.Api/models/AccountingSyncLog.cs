using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public class AccountingSyncLog
{
    public int Id { get; set; }

    [JsonIgnore]
    public int TenantId { get; set; }

    public AccountingProvider Provider { get; set; }

    [Required]
    [MaxLength(40)]
    public string Direction { get; set; } = string.Empty;

    [Required]
    [MaxLength(40)]
    public string Status { get; set; } = string.Empty;

    [Required]
    public string DetailsJson { get; set; } = "{}";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
