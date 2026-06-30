namespace TradeLike.Api.Contracts.Settings;

public sealed record StaffSettingsResponse(
    IReadOnlyList<StaffCategoryResponse> Categories,
    IReadOnlyList<StaffRolePresetResponse> RolePresets,
    IReadOnlyList<string> PermissionGroups
);

public sealed record StaffCategoryResponse(
    int Id,
    string Name,
    string Description,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public sealed record StaffRolePresetResponse(
    int Id,
    string Name,
    int CategoryId,
    string CategoryName,
    IReadOnlyList<string> Permissions,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public sealed record CreateStaffCategoryRequest(
    string Name,
    string? Description
);

public sealed record CreateStaffRolePresetRequest(
    string Name,
    int CategoryId,
    IReadOnlyList<string> Permissions
);
