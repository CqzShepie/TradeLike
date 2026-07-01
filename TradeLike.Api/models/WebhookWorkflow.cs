using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class WebhookWorkflow
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    [Required]
    [MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    public string TriggerEvent { get; set; } = string.Empty;

    public string FilterJson { get; set; } = "{}";

    public string TransformJson { get; set; } = "{}";

    [Required]
    [MaxLength(2048)]
    public string TargetUrl { get; set; } = string.Empty;

    [Required]
    [MaxLength(160)]
    public string SignatureSecret { get; set; } = string.Empty;

    public bool Enabled { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? LastQueuedAtUtc { get; set; }

    public List<WebhookWorkflowDelivery> Deliveries { get; set; } = new();
}

public class WebhookWorkflowDelivery
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    public int WebhookWorkflowId { get; set; }

    public WebhookWorkflow? WebhookWorkflow { get; set; }

    [Required]
    [MaxLength(120)]
    public string EventName { get; set; } = string.Empty;

    public string PayloadJson { get; set; } = "{}";

    [Required]
    [MaxLength(40)]
    public string Status { get; set; } = "Pending";

    public int AttemptCount { get; set; }

    public DateTime AvailableAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? LastAttemptAtUtc { get; set; }

    [MaxLength(1000)]
    public string? LastError { get; set; }
}
