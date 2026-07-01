using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class CustomerStaffMember
{
    public int Id { get; set; }

    public int CompanyUserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    public string RoleName { get; set; } = string.Empty;

    [Required]
    [MaxLength(40)]
    public string Status { get; set; } = "InvitePending";

    [Required]
    [MaxLength(120)]
    public string PermissionPresetName { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Skills { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string ServiceArea { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string WorkingHours { get; set; } = string.Empty;

    [Required]
    [MaxLength(40)]
    public string CalendarColour { get; set; } = "blue";

    public bool IsTwoFactorRequired { get; set; }

    public DateTime? LastLoginAt { get; set; }

    [MaxLength(120)]
    public string? InviteToken { get; set; }

    public DateTime? InviteSentAt { get; set; }

    public DateTime? InviteExpiresAt { get; set; }

    public DateTime? InviteAcceptedAt { get; set; }

    public DateTime? ResetPasswordRequestedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
