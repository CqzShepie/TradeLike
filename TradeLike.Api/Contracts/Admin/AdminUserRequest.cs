namespace TradeLike.Api.Contracts.Admin;

public sealed class CreateAdminUserRequest
{
    public string FirstName { get; init; } = string.Empty;

    public string LastName { get; init; } = string.Empty;

    public string Email { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;

    public string AccountStatus { get; init; } = "Trial";

    public string AdminNotes { get; init; } = string.Empty;
}

public sealed class UpdateAdminUserAccountRequest
{
    public string AccountStatus { get; init; } = "Trial";

    public string DiscountType { get; init; } = "None";

    public decimal DiscountValue { get; init; }

    public int FreeMonths { get; init; }

    public string AdminNotes { get; init; } = string.Empty;
}

public sealed class ResetAdminUserPasswordRequest
{
    public string NewPassword { get; init; } = string.Empty;

    public bool RequirePasswordReset { get; init; } = true;
}

public sealed class CreateStaffUserRequest
{
    public string FirstName { get; init; } = string.Empty;

    public string LastName { get; init; } = string.Empty;

    public string Email { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;

    public string Role { get; init; } = "Support";

    public bool CanManageAccounts { get; init; }

    public bool CanManageStaff { get; init; }

    public bool CanManageBilling { get; init; }

    public bool CanManageSecurity { get; init; }

    public bool CanViewAuditLogs { get; init; }

    public string AdminNotes { get; init; } = string.Empty;
}

public sealed class UpdateStaffPermissionsRequest
{
    public string Role { get; init; } = "Support";

    public string AccountStatus { get; init; } = "Active";

    public bool CanManageAccounts { get; init; }

    public bool CanManageStaff { get; init; }

    public bool CanManageBilling { get; init; }

    public bool CanManageSecurity { get; init; }

    public bool CanViewAuditLogs { get; init; }

    public string AdminNotes { get; init; } = string.Empty;
}