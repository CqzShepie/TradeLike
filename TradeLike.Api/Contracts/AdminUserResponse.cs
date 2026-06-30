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

    public string? AdminNotes { get; init; }

    public DateTime CreatedAt { get; init; }

    public DateTime? UpdatedAt { get; init; }
}