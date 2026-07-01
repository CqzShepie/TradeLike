using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public class Subscription
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    [JsonIgnore]
    public User? Tenant { get; set; }

    public int PlanId { get; set; }

    public Plan? Plan { get; set; }

    public int SeatsPurchased { get; set; }

    public DateTime BillingStartUtc { get; set; } = DateTime.UtcNow;

    public DateTime NextInvoiceDateUtc { get; set; } = DateTime.UtcNow.AddMonths(1);

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Trial";
}
