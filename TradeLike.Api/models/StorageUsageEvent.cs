using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class StorageUsageEvent
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    public int? StorageObjectId { get; set; }

    public long DeltaBytes { get; set; }

    [Required]
    [MaxLength(80)]
    public string Reason { get; set; } = string.Empty;

    public int? ActorUserId { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public StorageObject? StorageObject { get; set; }
}
