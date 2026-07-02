using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireManagerRole")]
[PlanGuard(Feature.TeamManagement)]
[Route("api/job-assignments")]
public sealed class JobAssignmentsController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public JobAssignmentsController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<JobAssignmentResponse>>> GetAssignments()
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);

        return Ok(await LoadAssignmentsAsync(false, tenantId));
    }

    [HttpGet("previous")]
    public async Task<ActionResult<IReadOnlyList<JobAssignmentResponse>>> GetPreviousAssignments()
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);

        return Ok(await LoadAssignmentsAsync(true, tenantId));
    }

    [HttpPut("{jobId:int}")]
    public async Task<ActionResult<IReadOnlyList<JobAssignmentResponse>>> UpdateAssignment(
        int jobId,
        UpdateJobAssignmentRequest request)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var staffIds = (request.AssignedStaffMemberIds ?? [])
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        var job = await _context.Jobs
            .FirstOrDefaultAsync(existingJob => existingJob.Id == jobId && existingJob.TenantId == tenantId);

        if (job is null)
        {
            return NotFound();
        }

        if (!await TeamBelongsToTenantAsync(request.AssignedTeamId, tenantId) ||
            !await StaffBelongToTenantAsync(request.LeadStaffMemberId, staffIds, tenantId))
        {
            return NotFound();
        }

        job.AssignedTeamId = request.AssignedTeamId;
        job.ScheduledEndDate = request.ScheduledEndDate;
        job.CalendarColour = string.IsNullOrWhiteSpace(request.CalendarColour)
            ? "blue"
            : request.CalendarColour.Trim();

        var assignment = await _context.JobAssignments
            .Include(existingAssignment => existingAssignment.StaffMembers)
            .FirstOrDefaultAsync(existingAssignment =>
                existingAssignment.JobId == jobId &&
                existingAssignment.TenantId == tenantId);

        if (assignment is null)
        {
            assignment = new JobAssignment
            {
                JobId = jobId,
                TenantId = tenantId,
                CreatedAt = DateTime.UtcNow
            };

            await _context.JobAssignments.AddAsync(assignment);
        }
        else
        {
            _context.JobAssignmentStaff.RemoveRange(assignment.StaffMembers);
        }

        assignment.LeadStaffMemberId = request.LeadStaffMemberId;
        assignment.StaffMembers = staffIds
            .Select(staffId => new JobAssignmentStaff
            {
                StaffMemberId = staffId
            })
            .ToList();

        await _context.SaveChangesAsync();

        return Ok(await LoadAssignmentsAsync(false, tenantId));
    }

    private async Task<IReadOnlyList<JobAssignmentResponse>> LoadAssignmentsAsync(bool previousOnly, int tenantId)
    {
        var today = DateTime.Today;
        var jobsQuery = _context.Jobs
            .AsNoTracking()
            .Where(job => job.TenantId == tenantId);

        jobsQuery = previousOnly
            ? jobsQuery
                .Where(job => job.Status == "Completed" || job.Status == "Cancelled" || job.ScheduledDate < today)
                .OrderByDescending(job => job.ScheduledDate)
            : jobsQuery.OrderBy(job => job.ScheduledDate);

        var jobs = await jobsQuery
            .Select(job => new
            {
                job.Id,
                job.AssignedTeamId,
                job.ScheduledEndDate,
                job.CalendarColour
            })
            .ToListAsync();

        var jobIds = jobs.Select(job => job.Id).ToList();
        var assignments = await _context.JobAssignments
            .AsNoTracking()
            .Include(assignment => assignment.StaffMembers)
            .Where(assignment => assignment.TenantId == tenantId && jobIds.Contains(assignment.JobId))
            .ToDictionaryAsync(assignment => assignment.JobId);

        return jobs
            .Select(job =>
            {
                assignments.TryGetValue(job.Id, out var assignment);

                var staffIds = assignment?.StaffMembers
                    .Select(staff => staff.StaffMemberId)
                    .Distinct()
                    .ToList() ?? [];

                return new JobAssignmentResponse(
                    job.Id,
                    job.AssignedTeamId,
                    assignment?.LeadStaffMemberId,
                    staffIds,
                    job.ScheduledEndDate,
                    job.CalendarColour);
            })
            .ToList();
    }

    private async Task<bool> TeamBelongsToTenantAsync(int? teamId, int tenantId)
    {
        return !teamId.HasValue ||
            await _context.CustomerStaffTeams
                .AsNoTracking()
                .AnyAsync(team => team.Id == teamId.Value && team.CompanyUserId == tenantId);
    }

    private async Task<bool> StaffBelongToTenantAsync(int? leadStaffMemberId, IReadOnlyCollection<int> staffIds, int tenantId)
    {
        var ids = staffIds
            .Append(leadStaffMemberId ?? 0)
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        if (ids.Count == 0)
        {
            return true;
        }

        var matchingCount = await _context.CustomerStaffMembers
            .AsNoTracking()
            .CountAsync(member => member.CompanyUserId == tenantId && member.Status == "Active" && ids.Contains(member.Id));

        return matchingCount == ids.Count;
    }
}

public sealed record JobAssignmentResponse(
    int JobId,
    int? AssignedTeamId,
    int? LeadStaffMemberId,
    IReadOnlyList<int> AssignedStaffMemberIds,
    DateTime? ScheduledEndDate,
    string? CalendarColour);

public sealed record UpdateJobAssignmentRequest(
    int? AssignedTeamId,
    int? LeadStaffMemberId,
    IReadOnlyList<int>? AssignedStaffMemberIds,
    DateTime? ScheduledEndDate,
    string? CalendarColour);
