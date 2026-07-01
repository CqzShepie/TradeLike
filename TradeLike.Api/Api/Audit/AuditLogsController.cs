using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Api.Audit;

[ApiController]
[Route("api/audit/logs")]
[Authorize(Policy = "RequireAdminRole")]
public sealed class AuditLogsController : ControllerBase
{
    private readonly TradeLikeDbContext _db;

    public AuditLogsController(TradeLikeDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AuditLogResponse>>> Get(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int? userId,
        [FromQuery] string? action,
        [FromQuery] string? entityType,
        CancellationToken cancellationToken)
    {
        var query = _db.AdminAuditLogs.AsNoTracking();

        if (from.HasValue)
        {
            query = query.Where(log => log.CreatedAtUtc >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(log => log.CreatedAtUtc <= to.Value);
        }

        if (userId.HasValue)
        {
            query = query.Where(log => log.UserId == userId || log.ActorUserId == userId);
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(log => log.Action == action);
        }

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            query = query.Where(log => log.EntityType == entityType || log.TargetType == entityType);
        }

        var logs = await query
            .OrderByDescending(log => log.CreatedAtUtc)
            .Take(250)
            .ToListAsync(cancellationToken);

        return Ok(logs.Select(ToResponse).ToList());
    }

    private static AuditLogResponse ToResponse(AdminAuditLog log)
    {
        return new AuditLogResponse
        {
            Id = log.Id,
            TenantId = log.TenantId,
            UserId = log.UserId ?? log.ActorUserId,
            UserName = log.ActorName,
            UserEmail = log.ActorEmail,
            Action = log.Action,
            EntityType = string.IsNullOrWhiteSpace(log.EntityType) ? log.TargetType : log.EntityType,
            EntityId = log.EntityId ?? log.TargetId?.ToString(),
            DiffJson = log.DiffJson ?? log.Details,
            IpAddress = log.IpAddress,
            UserAgent = log.UserAgent,
            CreatedAtUtc = log.CreatedAtUtc == default ? log.CreatedAt : log.CreatedAtUtc
        };
    }
}

public sealed class AuditLogResponse
{
    public int Id { get; init; }

    public int TenantId { get; init; }

    public int UserId { get; init; }

    public string UserName { get; init; } = string.Empty;

    public string UserEmail { get; init; } = string.Empty;

    public string Action { get; init; } = string.Empty;

    public string EntityType { get; init; } = string.Empty;

    public string? EntityId { get; init; }

    public string? DiffJson { get; init; }

    public string? IpAddress { get; init; }

    public string? UserAgent { get; init; }

    public DateTime CreatedAtUtc { get; init; }
}
