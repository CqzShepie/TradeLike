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