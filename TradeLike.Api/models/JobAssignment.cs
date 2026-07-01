namespace TradeLike.Api.Models;

public class JobAssignment
{
    public int Id { get; set; }

    public int JobId { get; set; }

    public Job Job { get; set; } = null!;

    public int? LeadStaffMemberId { get; set; }

    public CustomerStaffMember? LeadStaffMember { get; set; }

    public int TenantId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<JobAssignmentStaff> StaffMembers { get; set; } = [];
}
