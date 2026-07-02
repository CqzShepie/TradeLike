using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public class Job
{
    public int Id { get; set; }

    [JsonIgnore]
    public int TenantId { get; set; }

    [Required]
    [MaxLength(180)]
    public string Customer { get; set; } = string.Empty;

    [Required]
    [MaxLength(40)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [MaxLength(220)]
    public string JobTitle { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Address { get; set; } = string.Empty;

    [Required]
    public DateTime ScheduledDate { get; set; }

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Scheduled";

    [Required]
    [MaxLength(30)]
    public string Priority { get; set; } = "Normal";

    [MaxLength(4000)]
    public string? Notes { get; set; }

    public int? QuoteId { get; set; }

    [JsonIgnore]
    public Quote? Quote { get; set; }

    public int? EngineerId { get; set; }

    [JsonIgnore]
    public Engineer? Engineer { get; set; }

    [JsonIgnore]
    public int? AssignedTeamId { get; set; }

    [JsonIgnore]
    public int? LeadStaffMemberId { get; set; }

    [JsonIgnore]
    public DateTime? ScheduledEndDate { get; set; }

    [JsonIgnore]
    public string? CalendarColour { get; set; }

    public void Validate()
    {
        if (ScheduledDate.Year < 2024 || ScheduledDate.Year > 2099)
        {
            throw new ValidationException(
                "Scheduled date must be between 2024 and 2099.");
        }
    }
}
