namespace NotificationService;

public sealed class NotificationMessage
{
    public string MessageId { get; init; } = Guid.NewGuid().ToString("N");

    public string Kind { get; init; } = string.Empty;

    public int TenantId { get; init; }

    public string To { get; init; } = string.Empty;

    public string? Subject { get; init; }

    public string Body { get; init; } = string.Empty;

    public string? TemplateId { get; init; }

    public IReadOnlyDictionary<string, string> Variables { get; init; } = new Dictionary<string, string>();

    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
