namespace TradeLike.Api.Models;

public class JobAssignmentStaff
{
    public int JobAssignmentId { get; set; }

    public JobAssignment JobAssignment { get; set; } = null!;

    public int StaffMemberId { get; set; }

    public CustomerStaffMember StaffMember { get; set; } = null!;
}
