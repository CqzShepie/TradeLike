using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class PushSubscription
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    public int UserId { get; set; }

    [Required]
    [MaxLength(2048)]
    public string Endpoint { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string P256dh { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Auth { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
