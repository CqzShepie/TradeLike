using System.Text.Json;
using System.Security.Claims;

namespace TradeLike.Api.Api.Permissions;

public static class FieldSecurityMapper
{
    public static async Task<Dictionary<string, object?>> ApplyReadSecurityAsync(
        IPermissionService permissionService,
        ClaimsPrincipal user,
        string entity,
        object source,
        CancellationToken cancellationToken = default)
    {
        var json = JsonSerializer.Serialize(source, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var values = JsonSerializer.Deserialize<Dictionary<string, object?>>(json) ?? [];

        foreach (var field in values.Keys.ToArray())
        {
            if (!await permissionService.CanReadAsync(user, entity, field, cancellationToken))
            {
                values.Remove(field);
            }
        }

        return values;
    }
}
