namespace TradeLike.Api.Contracts.Admin;

public sealed class CreateAdminUserRequest
{
    public string FirstName { get; init; } = string.Empty;

    public string LastName { get; init; } = string.Empty;

    public string Email { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;

    public string AccountStatus { get; init; } = "Trial";

    public string BusinessName { get; init; } = string.Empty;

    public string OwnerName { get; init; } = string.Empty;

    public string OwnerPhone { get; init; } = string.Empty;

    public string SubscriptionPlan { get; init; } = "Trial";

    public string BillingStatus { get; init; } = "Trial";

    public DateTime? TrialEndsAt { get; init; }

    public DateTime? FreeMonthsExpireAt { get; init; }

    public string AdminTags { get; init; } = string.Empty;

    public string SupportNotes { get; init; } = string.Empty;

    public string HealthStatus { get; init; } = "Green";

    public string AccountSource { get; init; } = string.Empty;

    public string CancelReason { get; init; } = string.Empty;

    public string AdminNotes { get; init; } = string.Empty;
}

public sealed class UpdateAdminUserAccountRequest
{
    public string AccountStatus { get; init; } = "Trial";

    public string DiscountType { get; init; } = "None";

    public decimal DiscountValue { get; init; }

    public int FreeMonths { get; init; }

    public DateTime? FreeMonthsExpireAt { get; init; }

    public string BusinessName { get; init; } = string.Empty;

    public string OwnerName { get; init; } = string.Empty;

    public string OwnerPhone { get; init; } = string.Empty;

    public string SubscriptionPlan { get; init; } = "Trial";

    public string BillingStatus { get; init; } = "Trial";

    public DateTime? TrialEndsAt { get; init; }

    public string AdminTags { get; init; } = string.Empty;

    public string SupportNotes { get; init; } = string.Empty;

    public string HealthStatus { get; init; } = "Green";

    public string AccountSource { get; init; } = string.Empty;

    public string CancelReason { get; init; } = string.Empty;

    public string AdminNotes { get; init; } = string.Empty;

    public string Reason { get; init; } = string.Empty;
}

public sealed class UpdateCustomerPlanRequest
{
    public string Plan { get; init; } = "Solo";

    public int SeatsPurchased { get; init; } = 1;

    public string? BillingStatus { get; init; }

    public string Reason { get; init; } = string.Empty;
}

public sealed class UpdateCustomerDiscountRequest
{
    public string DiscountType { get; init; } = "None";

    public decimal DiscountValue { get; init; }

    public DateTime? ExpiresAtUtc { get; init; }

    public string Reason { get; init; } = string.Empty;
}

public sealed class UpdateCustomerFreeMonthsRequest
{
    public int FreeMonths { get; init; }

    public DateTime? ExpiresAtUtc { get; init; }

    public string Reason { get; init; } = string.Empty;
}

public sealed class UpdateCustomerStatusRequest
{
    public string AccountStatus { get; init; } = "Active";

    public string? BillingStatus { get; init; }

    public string Reason { get; init; } = string.Empty;
}

public sealed class AddCustomerSupportNoteRequest
{
    public string Note { get; init; } = string.Empty;

    public string[] Tags { get; init; } = Array.Empty<string>();
}

public sealed class ResetAdminUserPasswordRequest
{
    public bool SendResetLink { get; init; } = true;

    public bool ForcePasswordReset { get; init; }
}

public sealed class CreateStaffUserRequest
{
    public string FirstName { get; init; } = string.Empty;

    public string LastName { get; init; } = string.Empty;

    public string Email { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;

    public string Role { get; init; } = "Support";

    public string PersonalAssistantTo { get; init; } = string.Empty;

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

    public string AdminNotes { get; init; } = string.Empty;
}

public sealed class UpdateStaffPermissionsRequest
{
    public string Role { get; init; } = "Support";

    public string PersonalAssistantTo { get; init; } = string.Empty;

    public string AccountStatus { get; init; } = "Active";

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

    public string AdminNotes { get; init; } = string.Empty;
}
