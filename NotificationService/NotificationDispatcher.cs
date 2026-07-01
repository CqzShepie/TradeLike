using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace NotificationService;

public sealed class NotificationDispatcher
{
    public const string HttpClientName = "notification-dispatch";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<NotificationDispatcher> _logger;

    public NotificationDispatcher(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<NotificationDispatcher> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public Task DispatchAsync(
        string queueName,
        NotificationMessage message,
        CancellationToken cancellationToken)
    {
        return queueName switch
        {
            NotificationWorker.EmailQueueName => DispatchEmailAsync(message, cancellationToken),
            NotificationWorker.SmsQueueName => DispatchSmsAsync(message, cancellationToken),
            _ => throw new InvalidOperationException($"Unsupported notification queue '{queueName}'.")
        };
    }

    private async Task DispatchEmailAsync(
        NotificationMessage message,
        CancellationToken cancellationToken)
    {
        Validate(message, requireSubject: true);

        var webhookUrl = _configuration["EMAIL_WEBHOOK_URL"] ?? _configuration["Notifications:EmailWebhookUrl"];
        if (string.IsNullOrWhiteSpace(webhookUrl))
        {
            _logger.LogInformation(
                "Email notification {MessageId} for tenant {TenantId} accepted for {Recipient}.",
                message.MessageId,
                message.TenantId,
                message.To);
            return;
        }

        await PostWebhookAsync(webhookUrl, message, cancellationToken);
    }

    private async Task DispatchSmsAsync(
        NotificationMessage message,
        CancellationToken cancellationToken)
    {
        Validate(message, requireSubject: false);

        var webhookUrl = _configuration["SMS_WEBHOOK_URL"] ?? _configuration["Notifications:SmsWebhookUrl"];
        if (string.IsNullOrWhiteSpace(webhookUrl))
        {
            _logger.LogInformation(
                "SMS notification {MessageId} for tenant {TenantId} accepted for {Recipient}.",
                message.MessageId,
                message.TenantId,
                message.To);
            return;
        }

        await PostWebhookAsync(webhookUrl, message, cancellationToken);
    }

    private async Task PostWebhookAsync(
        string webhookUrl,
        NotificationMessage message,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, webhookUrl);
        request.Content = new StringContent(JsonSerializer.Serialize(message, JsonOptions), Encoding.UTF8, "application/json");

        using var response = await _httpClientFactory
            .CreateClient(HttpClientName)
            .SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(
                $"Notification webhook failed with status {(int)response.StatusCode}: {responseText}");
        }
    }

    private static void Validate(NotificationMessage message, bool requireSubject)
    {
        if (message.TenantId <= 0)
        {
            throw new InvalidOperationException("Notification tenant id is required.");
        }

        if (string.IsNullOrWhiteSpace(message.To))
        {
            throw new InvalidOperationException("Notification recipient is required.");
        }

        if (requireSubject && string.IsNullOrWhiteSpace(message.Subject))
        {
            throw new InvalidOperationException("Email subject is required.");
        }

        if (string.IsNullOrWhiteSpace(message.Body))
        {
            throw new InvalidOperationException("Notification body is required.");
        }
    }
}
