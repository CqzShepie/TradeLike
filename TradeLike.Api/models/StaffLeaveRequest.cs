using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public class StaffLeaveRequest
{
    public int Id { get; set; }

    [JsonIgnore]
    public int TenantId { get; set; }

    public int StaffMemberId { get; set; }

    [JsonIgnore]
    public CustomerStaffMember? StaffMember { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string LeaveType { get; set; } = "Paid";

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Pending";

    [MaxLength(500)]
    public string DecisionNote { get; set; } = string.Empty;

    public int? DecidedByUserId { get; set; }

    public DateTime? DecidedAt { get; set; }

    public DateTime? CancelledAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
