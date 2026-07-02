using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class TenantStorageAccount
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    public long IncludedStorageBytes { get; set; }

    public long PurchasedStorageBytes { get; set; }

    public long? ManualStorageOverrideBytes { get; set; }

    public long UsedStorageBytes { get; set; }

    [Required]
    [MaxLength(20)]
    public string WarningLevel { get; set; } = "OK";

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    [Timestamp]
    public byte[] RowVersion { get; set; } = [];

    public User? Tenant { get; set; }
}
