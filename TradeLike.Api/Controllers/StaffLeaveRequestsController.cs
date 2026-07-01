using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireCustomerRole")]
[Route("api/staff/leave-requests")]
public sealed class StaffLeaveRequestsController : ControllerBase
{
    private static readonly string[] AllowedStatuses = ["Pending", "Approved", "Rejected"];

    private readonly TradeLikeDbContext _context;

    public StaffLeaveRequestsController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<StaffLeaveRequestResponse>>> GetLeaveRequests()
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var requests = await _context.StaffLeaveRequests
            .AsNoTracking()
            .Where(request => request.TenantId == tenantId)
            .OrderBy(request => request.StartDate)
            .ThenBy(request => request.StaffMemberId)
            .Select(request => ToResponse(request))
            .ToListAsync();

        return Ok(requests);
    }

    [HttpPost]
    public async Task<ActionResult<StaffLeaveRequestResponse>> CreateLeaveRequest(CreateStaffLeaveRequest request)
    {
        try
        {
            var tenantId = TenantHelpers.GetTenantId(HttpContext);
            await EnsureStaffMemberBelongsToTenantAsync(request.StaffMemberId, tenantId);

            var leaveRequest = new StaffLeaveRequest
            {
                TenantId = tenantId,
                StaffMemberId = request.StaffMemberId,
                StartDate = request.StartDate.Date,
                EndDate = request.EndDate.Date,
                Reason = CleanOptional(request.Reason, 500),
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            ValidateLeaveRequest(leaveRequest);

            await _context.StaffLeaveRequests.AddAsync(leaveRequest);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetLeaveRequests), new { id = leaveRequest.Id }, ToResponse(leaveRequest));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<StaffLeaveRequestResponse>> UpdateLeaveRequest(int id, UpdateStaffLeaveRequest request)
    {
        try
        {
            var tenantId = TenantHelpers.GetTenantId(HttpContext);
            var leaveRequest = await _context.StaffLeaveRequests
                .FirstOrDefaultAsync(existing => existing.Id == id && existing.TenantId == tenantId);

            if (leaveRequest is null)
            {
                return NotFound();
            }

            leaveRequest.Status = CleanStatus(request.Status);
            leaveRequest.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ToResponse(leaveRequest));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteLeaveRequest(int id)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var leaveRequest = await _context.StaffLeaveRequests
            .FirstOrDefaultAsync(existing => existing.Id == id && existing.TenantId == tenantId);

        if (leaveRequest is null)
        {
            return NotFound();
        }

        _context.StaffLeaveRequests.Remove(leaveRequest);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task EnsureStaffMemberBelongsToTenantAsync(int staffMemberId, int tenantId)
    {
        if (staffMemberId <= 0)
        {
            throw new ValidationException("Choose a staff member.");
        }

        var exists = await _context.CustomerStaffMembers
            .AsNoTracking()
            .AnyAsync(member => member.Id == staffMemberId && member.CompanyUserId == tenantId);

        if (!exists)
        {
            throw new ValidationException("Staff member was not found.");
        }
    }

    private static void ValidateLeaveRequest(StaffLeaveRequest request)
    {
        if (request.EndDate < request.StartDate)
        {
            throw new ValidationException("End date must be on or after the start date.");
        }
    }

    private static string CleanStatus(string value)
    {
        var cleaned = string.IsNullOrWhiteSpace(value) ? "Pending" : value.Trim();

        return AllowedStatuses.FirstOrDefault(status =>
            string.Equals(status, cleaned, StringComparison.OrdinalIgnoreCase))
            ?? throw new ValidationException("Leave status is invalid.");
    }

    private static string CleanOptional(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var cleaned = value.Trim();
        return cleaned.Length > maxLength ? cleaned[..maxLength] : cleaned;
    }

    private static StaffLeaveRequestResponse ToResponse(StaffLeaveRequest request)
    {
        return new StaffLeaveRequestResponse(
            request.Id,
            request.StaffMemberId,
            request.StartDate,
            request.EndDate,
            request.Reason,
            request.Status,
            request.CreatedAt,
            request.UpdatedAt);
    }
}

public sealed record CreateStaffLeaveRequest(int StaffMemberId, DateTime StartDate, DateTime EndDate, string? Reason);

public sealed record UpdateStaffLeaveRequest(string Status);

public sealed record StaffLeaveRequestResponse(
    int Id,
    int StaffMemberId,
    DateTime StartDate,
    DateTime EndDate,
    string Reason,
    string Status,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
