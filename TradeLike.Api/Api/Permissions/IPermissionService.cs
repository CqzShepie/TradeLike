using System.Security.Claims;

namespace TradeLike.Api.Api.Permissions;

public interface IPermissionService
{
    Task<bool> CanReadAsync(ClaimsPrincipal user, string entity, string field, CancellationToken cancellationToken = default);

    Task<bool> CanWriteAsync(ClaimsPrincipal user, string entity, string field, CancellationToken cancellationToken = default);
}
