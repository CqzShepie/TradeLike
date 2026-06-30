using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class User
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Role { get; set; } = "Customer";

    [Required]
    [MaxLength(30)]
    public string AccountStatus { get; set; } = "Trial";

    public bool IsEmailVerified { get; set; }

    public DateTime? EmailVerificationSentAt { get; set; }

    [Required]
    [MaxLength(20)]
    public string DiscountType { get; set; } = "None";

    public decimal DiscountValue { get; set; }

    public int FreeMonths { get; set; }

    public bool PasswordResetRequired { get; set; }

    [MaxLength(4000)]
    public string? AdminNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}