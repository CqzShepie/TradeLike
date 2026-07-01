using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Api.Audit;

public sealed class AuditLogService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private static readonly string[] SecretTerms =
    [
        "password",
        "passwordhash",
        "secret",
        "token",
        "apikey",
        "connectionstring"
    ];

    private readonly TradeLikeDbContext _db;

    public AuditLogService(TradeLikeDbContext db)
    {
        _db = db;
    }

    public async Task<AdminAuditLog> LogAsync(
        HttpContext context,
        string action,
        string entityType,
        string? entityId,
        object? before,
        object? after,
        CancellationToken cancellationToken = default)
    {
        var userId = ReadIntClaim(context.User, ClaimTypes.NameIdentifier);
        var tenantId = ReadIntClaim(context.User, "tid") ?? 0;
        var userName = context.User.FindFirstValue(ClaimTypes.Name) ?? "Unknown user";
        var userEmail = context.User.FindFirstValue(ClaimTypes.Email) ?? "unknown";
        var userRole = context.User.FindFirstValue(ClaimTypes.Role) ??
            context.User.FindFirstValue("role") ??
            "Unknown";
        var createdAt = DateTime.UtcNow;

        var log = new AdminAuditLog
        {
            TenantId = tenantId,
            UserId = userId,
            ActorUserId = userId ?? 0,
            ActorEmail = userEmail,
            ActorName = userName,
            ActorRole = userRole,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            TargetType = entityType,
            TargetId = int.TryParse(entityId, out var targetId) ? targetId : null,
            Summary = $"{action} {entityType} {entityId}".Trim(),
            DiffJson = BuildDiffJson(before, after),
            Details = BuildDiffJson(before, after),
            IpAddress = context.Connection.RemoteIpAddress?.ToString(),
            UserAgent = context.Request.Headers.UserAgent.ToString(),
            CreatedAt = createdAt,
            CreatedAtUtc = createdAt
        };

        await _db.AdminAuditLogs.AddAsync(log, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        return log;
    }

    public static string BuildDiffJson(object? before, object? after)
    {
        var beforeValues = ToSafeDictionary(before);
        var afterValues = ToSafeDictionary(after);
        var diff = new SortedDictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        foreach (var key in beforeValues.Keys.Concat(afterValues.Keys).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            beforeValues.TryGetValue(key, out var oldValue);
            afterValues.TryGetValue(key, out var newValue);

            if (!JsonSerializer.Serialize(oldValue, JsonOptions).Equals(
                    JsonSerializer.Serialize(newValue, JsonOptions),
                    StringComparison.Ordinal))
            {
                diff[key] = new
                {
                    old = oldValue,
                    @new = newValue
                };
            }
        }

        return JsonSerializer.Serialize(diff, JsonOptions);
    }

    private static Dictionary<string, object?> ToSafeDictionary(object? value)
    {
        if (value is null)
        {
            return new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        }

        return value
            .GetType()
            .GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .Where(property => property.GetIndexParameters().Length == 0)
            .Where(property => !IsSecret(property.Name))
            .ToDictionary(
                property => property.Name,
                property => property.GetValue(value),
                StringComparer.OrdinalIgnoreCase);
    }

    private static bool IsSecret(string propertyName)
    {
        var normalized = propertyName.Replace("_", string.Empty, StringComparison.Ordinal).ToLowerInvariant();

        return SecretTerms.Any(term => normalized.Contains(term, StringComparison.Ordinal));
    }

    private static int? ReadIntClaim(ClaimsPrincipal user, string claimType)
    {
        return int.TryParse(user.FindFirstValue(claimType), out var value) ? value : null;
    }
}
