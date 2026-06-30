using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/staff")]
public class StaffRemovalController : ControllerBase
{
    private const string OwnerEmail = "admin@tradelike.co.uk";
    private readonly TradeLikeDbContext _context;

    public StaffRemovalController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpPost("{id:int}/remove-record")]
    public async Task<IActionResult> RemoveRecord(int id)
    {
        var actorEmail = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
        var actor = await _context.Users.FirstOrDefaultAsync(user => user.Email == actorEmail);

        if (actor is null || (actor.Role != "Director" && !actor.CanDeleteData))
        {
            return Forbid();
        }

        var staff = await _context.Users.FirstOrDefaultAsync(user => user.Id == id);

        if (staff is null)
        {
            return NotFound(new { error = "Staff member not found." });
        }

        if (staff.Id == actor.Id || staff.Email == OwnerEmail)
        {
            return BadRequest(new { error = "This staff account cannot be removed." });
        }

        var staffRoles = new[] { "Director", "Admin", "Support", "Junior Developer", "Developer", "Senior Developer", "Marketing", "Customer Service", "Operations Coordinator", "Personal Assistant" };

        if (!staffRoles.Contains(staff.Role))
        {
            return BadRequest(new { error = "Only staff accounts can be removed here." });
        }

        await _context.AdminAuditLogs.AddAsync(new AdminAuditLog
        {
            ActorUserId = actor.Id,
            ActorEmail = actor.Email,
            ActorName = $"{actor.FirstName} {actor.LastName}".Trim(),
            ActorRole = actor.Role,
            Action = "StaffRecordRemoved",
            TargetType = "User",
            TargetId = staff.Id,
            TargetEmail = staff.Email,
            Summary = $"Removed staff account {staff.Email}.",
            Details = $"Removed staff user {staff.Email}; Role={staff.Role}; Status={staff.AccountStatus}.",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.ToString(),
            CreatedAt = DateTime.UtcNow
        });

        _context.Users.Remove(staff);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Staff account removed." });
    }
}
