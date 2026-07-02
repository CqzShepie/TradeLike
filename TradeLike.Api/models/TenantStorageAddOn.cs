using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class TenantStorageAddOn
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    public int StorageAddOnPlanId { get; set; }

    public StorageAddOnPlan? StorageAddOnPlan { get; set; }

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Pending";

    [MaxLength(160)]
    public string? StripeSubscriptionId { get; set; }

    [MaxLength(160)]
    public string? StripeSubscriptionItemId { get; set; }

    [MaxLength(160)]
    public string? StripePriceId { get; set; }

    public DateTime? CurrentPeriodEndUtc { get; set; }

    public bool CancelAtPeriodEnd { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
