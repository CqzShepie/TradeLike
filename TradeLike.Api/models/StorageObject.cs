using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class StorageObject
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    [Required]
    [MaxLength(500)]
    public string BlobKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    public string ContentType { get; set; } = "application/octet-stream";

    public long SizeBytes { get; set; }

    [Required]
    [MaxLength(60)]
    public string Category { get; set; } = "Document";

    [MaxLength(80)]
    public string? LinkedEntityType { get; set; }

    public int? LinkedEntityId { get; set; }

    public bool IsGenerated { get; set; }

    public int? ParentStorageObjectId { get; set; }

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Active";

    public int? CreatedByUserId { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? DeletedAtUtc { get; set; }

    public int? DeletedByUserId { get; set; }

    public StorageObject? ParentStorageObject { get; set; }
}
