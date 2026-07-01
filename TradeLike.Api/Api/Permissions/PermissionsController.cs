using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Api.Permissions;

[ApiController]
[Route("api/permissions/matrix")]
[Authorize(Policy = "RequireDirectorRole")]
public sealed class PermissionsController : ControllerBase
{
    private readonly TradeLikeDbContext _db;

    public PermissionsController(TradeLikeDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<PermissionsMatrixResponse>> Get(CancellationToken cancellationToken)
    {
        var service = new PermissionService(_db);
        var rows = await service.GetMatrixAsync(cancellationToken);

        return Ok(new PermissionsMatrixResponse
        {
            Roles = rows.Select(row => row.RoleName).Distinct().Order().ToArray(),
            Entities = rows.Select(row => row.Entity).Distinct().Order().ToArray(),
            Permissions = rows.Select(ToResponse).ToArray()
        });
    }

    [HttpPut]
    public async Task<ActionResult<PermissionsMatrixResponse>> Save(
        [FromBody] SavePermissionsRequest request,
        CancellationToken cancellationToken)
    {
        var service = new PermissionService(_db);
        await service.UpsertAsync(
            request.Permissions.Select(permission => new RolePermission
            {
                RoleName = permission.RoleName.Trim(),
                Entity = permission.Entity.Trim(),
                Field = permission.Field.Trim(),
                Permission = permission.Permission
            }).ToList(),
            cancellationToken);

        return await Get(cancellationToken);
    }

    private static RolePermissionResponse ToResponse(RolePermission permission)
    {
        return new RolePermissionResponse
        {
            RoleName = permission.RoleName,
            Entity = permission.Entity,
            Field = permission.Field,
            Permission = permission.Permission
        };
    }
}

public sealed class SavePermissionsRequest
{
    public IReadOnlyList<RolePermissionRequest> Permissions { get; init; } = [];
}

public sealed class RolePermissionRequest
{
    public string RoleName { get; init; } = string.Empty;

    public string Entity { get; init; } = string.Empty;

    public string Field { get; init; } = string.Empty;

    public FieldPermission Permission { get; init; }
}

public sealed class PermissionsMatrixResponse
{
    public IReadOnlyList<string> Roles { get; init; } = [];

    public IReadOnlyList<string> Entities { get; init; } = [];

    public IReadOnlyList<RolePermissionResponse> Permissions { get; init; } = [];
}

public sealed class RolePermissionResponse
{
    public string RoleName { get; init; } = string.Empty;

    public string Entity { get; init; } = string.Empty;

    public string Field { get; init; } = string.Empty;

    public FieldPermission Permission { get; init; }
}
