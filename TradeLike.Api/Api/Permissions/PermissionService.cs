using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Api.Permissions;

public sealed class PermissionService : IPermissionService
{
    private readonly TradeLikeDbContext _db;

    public PermissionService(TradeLikeDbContext db)
    {
        _db = db;
    }

    public async Task<bool> CanReadAsync(
        ClaimsPrincipal user,
        string entity,
        string field,
        CancellationToken cancellationToken = default)
    {
        var permission = await ResolveAsync(GetRole(user), entity, field, cancellationToken);

        return permission is FieldPermission.Read or FieldPermission.Write;
    }

    public async Task<bool> CanWriteAsync(
        ClaimsPrincipal user,
        string entity,
        string field,
        CancellationToken cancellationToken = default)
    {
        var permission = await ResolveAsync(GetRole(user), entity, field, cancellationToken);

        return permission == FieldPermission.Write;
    }

    public async Task<IReadOnlyList<RolePermission>> GetMatrixAsync(CancellationToken cancellationToken = default)
    {
        return await _db.RolePermissions
            .AsNoTracking()
            .OrderBy(permission => permission.RoleName)
            .ThenBy(permission => permission.Entity)
            .ThenBy(permission => permission.Field)
            .ToListAsync(cancellationToken);
    }

    public async Task UpsertAsync(
        IReadOnlyList<RolePermission> permissions,
        CancellationToken cancellationToken = default)
    {
        foreach (var permission in permissions)
        {
            var existing = await _db.RolePermissions.FindAsync(
                [permission.RoleName, permission.Entity, permission.Field],
                cancellationToken);

            if (existing is null)
            {
                permission.UpdatedAtUtc = DateTime.UtcNow;
                await _db.RolePermissions.AddAsync(permission, cancellationToken);
            }
            else
            {
                existing.Permission = permission.Permission;
                existing.UpdatedAtUtc = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<FieldPermission> ResolveAsync(
        string role,
        string entity,
        string field,
        CancellationToken cancellationToken)
    {
        var permissions = await _db.RolePermissions
            .AsNoTracking()
            .Where(permission => permission.RoleName == role)
            .ToListAsync(cancellationToken);

        var exact = permissions.FirstOrDefault(permission =>
            Matches(permission.Entity, entity) &&
            Matches(permission.Field, field));

        if (exact is not null)
        {
            return exact.Permission;
        }

        var wildcard = permissions.FirstOrDefault(permission =>
            permission.Entity == "*" &&
            permission.Field == "*");

        if (wildcard is not null)
        {
            return wildcard.Permission;
        }

        return role is "Director" or "Staff" or "CustomerDirector"
            ? FieldPermission.Write
            : FieldPermission.Read;
    }

    private static string GetRole(ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.Role) ??
            user.FindFirstValue("role") ??
            string.Empty;
    }

    private static bool Matches(string configured, string requested)
    {
        return configured == "*" ||
            string.Equals(configured, requested, StringComparison.OrdinalIgnoreCase);
    }
}
