using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class User
{
    public int Id { get; set; }

    public int TenantId { get; set; }

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
    [MaxLength(40)]
    public string Role { get; set; } = "CustomerDirector";

    [MaxLength(220)]
    public string? PersonalAssistantTo { get; set; }

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

    public DateTime? FreeMonthsExpireAt { get; set; }

    public bool PasswordResetRequired { get; set; }

    [MaxLength(180)]
    public string? BusinessName { get; set; }

    [MaxLength(180)]
    public string? OwnerName { get; set; }

    [MaxLength(40)]
    public string? OwnerPhone { get; set; }

    [Required]
    [MaxLength(40)]
    public string SubscriptionPlan { get; set; } = "Solo";

    [Required]
    [MaxLength(40)]
    public string BillingStatus { get; set; } = "Trial";

    public DateTime? TrialEndsAt { get; set; }

    [MaxLength(500)]
    public string? AdminTags { get; set; }

    [MaxLength(4000)]
    public string? SupportNotes { get; set; }

    [Required]
    [MaxLength(30)]
    public string HealthStatus { get; set; } = "Green";

    public DateTime? LastLoginAt { get; set; }

    [MaxLength(120)]
    public string? AccountSource { get; set; }

    [MaxLength(500)]
    public string? CancelReason { get; set; }

    public DateTime? OnboardingEmailSentAt { get; set; }

    public bool CanManageAccounts { get; set; }

    public bool CanManageStaff { get; set; }

    public bool CanManageBilling { get; set; }

    public bool CanManageSecurity { get; set; }

    public bool CanViewAuditLogs { get; set; }

    public bool CanCreateCustomers { get; set; }

    public bool CanEditCustomers { get; set; }

    public bool CanCancelCustomers { get; set; }

    public bool CanResetPasswords { get; set; }

    public bool CanVerifyEmails { get; set; }

    public bool CanSendEmails { get; set; }

    public bool CanManageDiscounts { get; set; }

    public bool CanManageFreeMonths { get; set; }

    public bool CanViewCustomerNotes { get; set; }

    public bool CanEditCustomerNotes { get; set; }

    public bool CanViewBilling { get; set; }

    public bool CanManageSubscriptions { get; set; }

    public bool CanExportData { get; set; }

    public bool CanImpersonateCustomer { get; set; }

    public bool CanDeleteData { get; set; }

    public bool CanViewStaff { get; set; }

    public bool CanCreateStaff { get; set; }

    public bool CanCancelStaff { get; set; }

    public bool CanEditStaffPermissions { get; set; }

    public bool CanViewSecurityLogs { get; set; }

    [MaxLength(4000)]
    public string? AdminNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
