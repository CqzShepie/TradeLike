using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class CustomerStaffSecurityRequest
{
    public int Id { get; set; }

    public int CompanyUserId { get; set; }

    public int StaffMemberId { get; set; }

    [Required]
    [MaxLength(80)]
    public string RequestType { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
