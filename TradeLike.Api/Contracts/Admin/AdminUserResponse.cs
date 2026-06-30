namespace TradeLike.Api.Contracts.Admin;

public sealed class AdminUserResponse
{
    public int Id { get; init; }

    public string FirstName { get; init; } = string.Empty;

    public string LastName { get; init; } = string.Empty;

    public string FullName { get; init; } = string.Empty;

    public string Email { get; init; } = string.Empty;

    public string Role { get; init; } = string.Empty;

    public string AccountStatus { get; init; } = string.Empty;

    public bool IsEmailVerified { get; init; }

    public DateTime? EmailVerificationSentAt { get; init; }

    public string DiscountType { get; init; } = string.Empty;

    public decimal DiscountValue { get; init; }

    public int FreeMonths { get; init; }

    public bool PasswordResetRequired { get; init; }

    public bool CanManageAccounts { get; init; }

    public bool CanManageStaff { get; init; }

    public bool CanManageBilling { get; init; }

    public bool CanManageSecurity { get; init; }

    public bool CanViewAuditLogs { get; init; }

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