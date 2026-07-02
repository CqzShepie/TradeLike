namespace TradeLike.Api.Contracts.Admin;

public sealed class AdminUserResponse
{
    public int Id { get; init; }

    public int TenantId { get; init; }

    public string FirstName { get; init; } = string.Empty;

    public string LastName { get; init; } = string.Empty;

    public string FullName { get; init; } = string.Empty;

    public string Email { get; init; } = string.Empty;

    public string Role { get; init; } = string.Empty;

    public string? PersonalAssistantTo { get; init; }

    public string AccountStatus { get; init; } = string.Empty;

    public bool IsEmailVerified { get; init; }

    public DateTime? EmailVerificationSentAt { get; init; }

    public string DiscountType { get; init; } = string.Empty;

    public decimal DiscountValue { get; init; }

    public int FreeMonths { get; init; }

    public DateTime? FreeMonthsExpireAt { get; init; }

    public bool PasswordResetRequired { get; init; }

    public string? BusinessName { get; init; }

    public string? OwnerName { get; init; }

    public string? OwnerPhone { get; init; }

    public string SubscriptionPlan { get; init; } = string.Empty;

    public string BillingStatus { get; init; } = string.Empty;

    public DateTime? TrialEndsAt { get; init; }

    public string? AdminTags { get; init; }

    public string? SupportNotes { get; init; }

    public string HealthStatus { get; init; } = string.Empty;

    public DateTime? LastLoginAt { get; init; }

    public string? AccountSource { get; init; }

    public string? CancelReason { get; init; }

    public DateTime? OnboardingEmailSentAt { get; init; }

    public bool CanManageAccounts { get; init; }

    public bool CanManageStaff { get; init; }

    public bool CanManageBilling { get; init; }

    public bool CanManageSecurity { get; init; }

    public bool CanViewAuditLogs { get; init; }

    public bool CanCreateCustomers { get; init; }

    public bool CanEditCustomers { get; init; }

    public bool CanCancelCustomers { get; init; }

    public bool CanResetPasswords { get; init; }

    public bool CanVerifyEmails { get; init; }

    public bool CanSendEmails { get; init; }

    public bool CanManageDiscounts { get; init; }

    public bool CanManageFreeMonths { get; init; }

    public bool CanViewCustomerNotes { get; init; }

    public bool CanEditCustomerNotes { get; init; }

    public bool CanViewBilling { get; init; }

    public bool CanManageSubscriptions { get; init; }

    public bool CanExportData { get; init; }

    public bool CanImpersonateCustomer { get; init; }

    public bool CanDeleteData { get; init; }

    public bool CanViewStaff { get; init; }

    public bool CanCreateStaff { get; init; }

    public bool CanCancelStaff { get; init; }

    public bool CanEditStaffPermissions { get; init; }

    public bool CanViewSecurityLogs { get; init; }

    public string? AdminNotes { get; init; }

    public DateTime CreatedAt { get; init; }

    public DateTime? UpdatedAt { get; init; }
}

public sealed class AdminAuditLogResponse
{
    public int Id { get; init; }

    public int ActorUserId { get; init; }

    public string ActorEmail { get; init; } = string.Empty;

    public string ActorName { get; init; } = string.Empty;

    public string ActorRole { get; init; } = string.Empty;

    public string Action { get; init; } = string.Empty;

    public string TargetType { get; init; } = string.Empty;

    public int? TargetId { get; init; }

    public string? TargetEmail { get; init; }

    public string Summary { get; init; } = string.Empty;

    public string? Details { get; init; }

    public string? IpAddress { get; init; }

    public string? UserAgent { get; init; }

    public DateTime CreatedAt { get; init; }
}
