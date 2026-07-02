using System.ComponentModel.DataAnnotations;
using TradeLike.Api.Contracts.Validation;

namespace TradeLike.Api.Contracts.Jobs;

public sealed class UpdateJobRequest
{
    public int? CustomerId { get; set; }

    [MaxLength(180, ErrorMessage = "Customer must be 180 characters or fewer.")]
    public string? Customer { get; set; }

    [RegularExpression(@"^\+?[0-9\s().-]{7,40}$", ErrorMessage = "Enter a valid phone number.")]
    [MaxLength(40, ErrorMessage = "Phone number must be 40 characters or fewer.")]
    public string? Phone { get; set; }

    [MaxLength(220, ErrorMessage = "Job title must be 220 characters or fewer.")]
    public string? JobTitle { get; set; }

    [MaxLength(500, ErrorMessage = "Address must be 500 characters or fewer.")]
    public string? Address { get; set; }

    [NotPastDate(ErrorMessage = "Scheduled date cannot be in the past.")]
    public DateTime? ScheduledDate { get; set; }

    [MaxLength(30, ErrorMessage = "Status must be 30 characters or fewer.")]
    public string? Status { get; set; }

    [MaxLength(30, ErrorMessage = "Priority must be 30 characters or fewer.")]
    public string? Priority { get; set; }

    [MaxLength(4000, ErrorMessage = "Notes must be 4000 characters or fewer.")]
    public string? Notes { get; set; }

    public int? EngineerId { get; set; }
}
