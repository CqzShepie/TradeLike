using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/customer-staff-invites")]
public sealed class CustomerStaffInvitesController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public CustomerStaffInvitesController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [EnableRateLimiting("company-staff-invite")]
    [HttpGet("preview")]
    public async Task<ActionResult<CustomerStaffInvitePreviewResponse>> Preview([FromQuery] string token)
    {
        var invite = await FindPendingInviteAsync(token);
        return invite is null
            ? NotFound(new { error = "Invite not found or expired." })
            : Ok(ToResponse(invite));
    }

    [EnableRateLimiting("company-staff-invite")]
    [HttpPost("accept")]
    public async Task<ActionResult<CustomerStaffInvitePreviewResponse>> Accept(AcceptCustomerStaffInviteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            return BadRequest(new { error = "Enter the invite token." });
        }

        var invite = await FindPendingInviteAsync(request.Token);
        if (invite is null)
        {
            return NotFound(new { error = "Invite not found or expired." });
        }

        var now = DateTime.UtcNow;
        var updatedRows = await _context.CustomerStaffMembers
            .Where(member =>
                member.Id == invite.Id &&
                member.InviteToken == request.Token.Trim() &&
                member.Status == "InvitePending" &&
                member.InviteExpiresAt.HasValue &&
                member.InviteExpiresAt.Value > now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(member => member.Status, "Active")
                .SetProperty(member => member.InviteToken, (string?)null)
                .SetProperty(member => member.InviteAcceptedAt, now)
                .SetProperty(member => member.UpdatedAt, now));

        if (updatedRows == 0)
        {
            return NotFound(new { error = "Invite not found or expired." });
        }

        invite.Status = "Active";
        invite.InviteToken = null;
        invite.InviteAcceptedAt = now;
        invite.UpdatedAt = now;
        return Ok(ToResponse(invite));
    }

    private async Task<CustomerStaffMember?> FindPendingInviteAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var now = DateTime.UtcNow;
        var cleanToken = token.Trim();

        return await _context.CustomerStaffMembers
            .FirstOrDefaultAsync(member =>
                member.InviteToken == cleanToken &&
                member.Status == "InvitePending" &&
                member.InviteExpiresAt.HasValue &&
                member.InviteExpiresAt.Value > now);
    }

    private static CustomerStaffInvitePreviewResponse ToResponse(CustomerStaffMember member)
    {
        return new CustomerStaffInvitePreviewResponse(
            member.Id,
            member.FirstName,
            member.LastName,
            member.Email,
            member.RoleName,
            member.Status,
            member.InviteSentAt,
            member.InviteExpiresAt,
            member.InviteAcceptedAt);
    }
}

public sealed record CustomerStaffInvitePreviewResponse(
    int Id,
    string FirstName,
    string LastName,
    string Email,
    string RoleName,
    string Status,
    DateTime? InviteSentAt,
    DateTime? InviteExpiresAt,
    DateTime? InviteAcceptedAt);

public sealed record AcceptCustomerStaffInviteRequest(string Token);
