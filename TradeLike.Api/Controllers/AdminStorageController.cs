using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Storage;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;
using TradeLike.Api.Services.Storage;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireStudioStaffRole")]
[Route("api/admin/storage")]
public sealed class AdminStorageController : ControllerBase
{
    private readonly TradeLikeDbContext _context;
    private readonly StorageQuotaService _storageQuotaService;

    public AdminStorageController(TradeLikeDbContext context, StorageQuotaService storageQuotaService)
    {
        _context = context;
        _storageQuotaService = storageQuotaService;
    }

    [HttpGet("{tenantId:int}")]
    public async Task<ActionResult<AdminStorageTenantResponse>> GetTenantStorage(
        int tenantId,
        CancellationToken cancellationToken)
    {
        var tenant = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.Id == tenantId || user.TenantId == tenantId, cancellationToken);

        if (tenant is null)
        {
            return NotFound();
        }

        return Ok(new AdminStorageTenantResponse(
            tenantId,
            tenant.BusinessName,
            tenant.Email,
            await _storageQuotaService.GetUsageAsync(tenantId, cancellationToken)));
    }

    [HttpPut("{tenantId:int}/override")]
    public async Task<ActionResult<AdminStorageTenantResponse>> SetManualOverride(
        int tenantId,
        AdminStorageOverrideRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(new { error = "Reason is required for manual storage changes." });
        }

        var actor = await GetCurrentStaffUserAsync(cancellationToken);
        if (actor is null || !CanManageStorage(actor))
        {
            return Forbid();
        }

        await _storageQuotaService.SetManualOverrideAsync(
            tenantId,
            request.ManualStorageOverrideBytes,
            actor.Id,
            cancellationToken);

        await _context.AdminAuditLogs.AddAsync(new AdminAuditLog
        {
            TenantId = tenantId,
            ActorUserId = actor.Id,
            ActorEmail = actor.Email,
            ActorName = $"{actor.FirstName} {actor.LastName}".Trim(),
            ActorRole = actor.Role,
            Action = "StorageManualOverrideChanged",
            TargetType = "TenantStorageAccount",
            TargetId = tenantId,
            TargetEmail = actor.Email,
            Summary = "Manual storage override changed.",
            Details = $"Reason: {request.Reason.Trim()}. ManualStorageOverrideBytes={request.ManualStorageOverrideBytes?.ToString() ?? "null"}.",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers["User-Agent"].ToString()
        }, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        return await GetTenantStorage(tenantId, cancellationToken);
    }

    [HttpPost("{tenantId:int}/recalculate")]
    public async Task<ActionResult<StorageUsageResponse>> Recalculate(
        int tenantId,
        CancellationToken cancellationToken)
    {
        var actor = await GetCurrentStaffUserAsync(cancellationToken);
        if (actor is null || !CanManageStorage(actor))
        {
            return Forbid();
        }

        return Ok(await _storageQuotaService.RecalculateUsageAsync(tenantId, actor.Id, cancellationToken));
    }

    private async Task<User?> GetCurrentStaffUserAsync(CancellationToken cancellationToken)
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        return await _context.Users.FirstOrDefaultAsync(user => user.Email == email, cancellationToken);
    }

    private static bool CanManageStorage(User user)
    {
        return CustomerRoles.StudioRoles.Contains(CustomerRoles.Normalize(user.Role)) ||
               user.CanManageSubscriptions ||
               user.CanManageBilling;
    }
}
