using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class AdminAuditLog
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    public int ActorUserId { get; set; }

    [Required]
    [MaxLength(255)]
    public string ActorEmail { get; set; } = string.Empty;

    [Required]
    [MaxLength(220)]
    public string ActorName { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string ActorRole { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    public string Action { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string TargetType { get; set; } = string.Empty;

    public int? TargetId { get; set; }

    [MaxLength(255)]
    public string? TargetEmail { get; set; }

    [Required]
    [MaxLength(500)]
    public string Summary { get; set; } = string.Empty;

    [MaxLength(4000)]
    public string? Details { get; set; }

    [MaxLength(80)]
    public string? IpAddress { get; set; }

    [MaxLength(500)]
    public string? UserAgent { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
