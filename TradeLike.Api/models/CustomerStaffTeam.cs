using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class CustomerStaffTeam
{
    public int Id { get; set; }

    public int CompanyUserId { get; set; }

    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(40)]
    public string Colour { get; set; } = "blue";

    public int? TeamLeadStaffId { get; set; }

    [Required]
    [MaxLength(120)]
    public string DefaultJobType { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string ServiceArea { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string WorkingHours { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
