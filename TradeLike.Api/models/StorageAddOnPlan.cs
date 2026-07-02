using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class StorageAddOnPlan
{
    public int Id { get; set; }

    [Required]
    [MaxLength(40)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string Label { get; set; } = string.Empty;

    public long ExtraStorageBytes { get; set; }

    public int MonthlyPricePence { get; set; }

    [MaxLength(160)]
    public string? StripePriceId { get; set; }

    public bool IsActive { get; set; } = true;
}
