using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class Job
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Customer { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string JobTitle { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string Address { get; set; } = string.Empty;

    [Required]
    public DateTime ScheduledDate { get; set; }

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Scheduled";

    [Required]
    [MaxLength(30)]
    public string Priority { get; set; } = "Normal";

    public void Validate()
    {
        if (ScheduledDate.Year < 2024 || ScheduledDate.Year > 2099)
        {
            throw new ValidationException(
                "Scheduled date must be between 2024 and 2099.");
        }
    }
}