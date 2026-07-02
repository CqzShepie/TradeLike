using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class Plan
{
    public int Id { get; set; }

    [Required]
    [MaxLength(40)]
    public string Name { get; set; } = string.Empty;

    public int? MonthlyPricePence { get; set; }

    public int? MaxIncludedUsers { get; set; }

    public int? AdditionalUserCostPence { get; set; }

    public long? IncludedStorageBytes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
