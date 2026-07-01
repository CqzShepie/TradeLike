using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TradeLike.Api;

public sealed class NotificationQueue
{
    public const string EmailQueueName = "notifications-email";
    public const string SmsQueueName = "notifications-sms";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<NotificationQueue>? _logger;

    public NotificationQueue(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<NotificationQueue>? logger = null)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public Task EnqueueEmailAsync(
        EmailNotification notification,
        CancellationToken cancellationToken = default)
    {
        return EnqueueAsync(EmailQueueName, NotificationEnvelope.ForEmail(notification), cancellationToken);
    }

    public Task EnqueueSmsAsync(
        SmsNotification notification,
        CancellationToken cancellationToken = default)
    {
        return EnqueueAsync(SmsQueueName, NotificationEnvelope.ForSms(notification), cancellationToken);
    }

    public async Task EnqueueAsync(
        string queueName,
        NotificationEnvelope envelope,
        CancellationToken cancellationToken = default)
    {
        var connection = ServiceBusRestConnection.FromConfiguration(_configuration);
        var resourceUri = connection.GetQueueResourceUri(queueName);
        var requestUri = new Uri($"{resourceUri}/messages");

        using var request = new HttpRequestMessage(HttpMethod.Post, requestUri);
        request.Headers.Authorization = AuthenticationHeaderValue.Parse(connection.CreateSasToken(resourceUri));
        request.Headers.TryAddWithoutValidation("BrokerProperties", JsonSerializer.Serialize(new
        {
            MessageId = envelope.MessageId,
            Label = envelope.Kind,
            ContentType = "application/json"
        }, JsonOptions));
        request.Content = new StringContent(JsonSerializer.Serialize(envelope, JsonOptions), Encoding.UTF8, "application/json");

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var responseText = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger?.LogWarning(
                "Failed to enqueue notification {MessageId} to {QueueName}. Status {StatusCode}: {Response}",
                envelope.MessageId,
                queueName,
                (int)response.StatusCode,
                responseText);

            throw new InvalidOperationException($"Failed to enqueue notification to {queueName}.");
        }
    }
}

public sealed class EmailNotification
{
    public int TenantId { get; init; }

    public string To { get; init; } = string.Empty;

    public string Subject { get; init; } = string.Empty;

    public string Body { get; init; } = string.Empty;

    public string? TemplateId { get; init; }

    public IReadOnlyDictionary<string, string> Variables { get; init; } = new Dictionary<string, string>();
}

public sealed class SmsNotification
{
    public int TenantId { get; init; }

    public string To { get; init; } = string.Empty;

    public string Body { get; init; } = string.Empty;

    public string? TemplateId { get; init; }

    public IReadOnlyDictionary<string, string> Variables { get; init; } = new Dictionary<string, string>();
}

public sealed class NotificationEnvelope
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

    public static NotificationEnvelope ForEmail(EmailNotification notification)
    {
        return new NotificationEnvelope
        {
            Kind = "email",
            TenantId = notification.TenantId,
            To = notification.To,
            Subject = notification.Subject,
            Body = notification.Body,
            TemplateId = notification.TemplateId,
            Variables = notification.Variables
        };
    }

    public static NotificationEnvelope ForSms(SmsNotification notification)
    {
        return new NotificationEnvelope
        {
            Kind = "sms",
            TenantId = notification.TenantId,
            To = notification.To,
            Body = notification.Body,
            TemplateId = notification.TemplateId,
            Variables = notification.Variables
        };
    }
}

internal sealed class ServiceBusRestConnection
{
    private ServiceBusRestConnection(
        Uri endpoint,
        string sharedAccessKeyName,
        string sharedAccessKey)
    {
        Endpoint = endpoint;
        SharedAccessKeyName = sharedAccessKeyName;
        SharedAccessKey = sharedAccessKey;
    }

    private Uri Endpoint { get; }

    private string SharedAccessKeyName { get; }

    private string SharedAccessKey { get; }

    public static ServiceBusRestConnection FromConfiguration(IConfiguration configuration)
    {
        var connectionString =
            configuration["SERVICEBUS_CONNECTION_STRING"] ??
            configuration["AZURE_SERVICEBUS_CONNECTION_STRING"] ??
            configuration["AzureServiceBus:ConnectionString"];

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "SERVICEBUS_CONNECTION_STRING or AZURE_SERVICEBUS_CONNECTION_STRING must be configured.");
        }

        var parts = connectionString
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(part => part.Split('=', 2))
            .Where(part => part.Length == 2)
            .ToDictionary(part => part[0], part => part[1], StringComparer.OrdinalIgnoreCase);

        if (!parts.TryGetValue("Endpoint", out var endpointValue) ||
            !parts.TryGetValue("SharedAccessKeyName", out var keyName) ||
            !parts.TryGetValue("SharedAccessKey", out var key))
        {
            throw new InvalidOperationException("Azure Service Bus connection string is missing SAS credentials.");
        }

        var endpoint = endpointValue.StartsWith("sb://", StringComparison.OrdinalIgnoreCase)
            ? new Uri("https://" + endpointValue["sb://".Length..])
            : new Uri(endpointValue);

        return new ServiceBusRestConnection(endpoint, keyName, key);
    }

    public string GetQueueResourceUri(string queueName)
    {
        if (string.IsNullOrWhiteSpace(queueName))
        {
            throw new ArgumentException("Queue name is required.", nameof(queueName));
        }

        return new Uri(Endpoint, queueName.Trim('/')).ToString().TrimEnd('/');
    }

    public string CreateSasToken(string resourceUri)
    {
        var expires = DateTimeOffset.UtcNow.AddMinutes(10).ToUnixTimeSeconds();
        var encodedResourceUri = Uri.EscapeDataString(resourceUri.ToLowerInvariant());
        var stringToSign = $"{encodedResourceUri}\n{expires}";
        var keyBytes = Convert.FromBase64String(SharedAccessKey);

        using var hmac = new HMACSHA256(keyBytes);
        var signature = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(stringToSign)));

        return string.Join(
            '&',
            "SharedAccessSignature sr=" + encodedResourceUri,
            "sig=" + Uri.EscapeDataString(signature),
            "se=" + expires.ToString(),
            "skn=" + Uri.EscapeDataString(SharedAccessKeyName));
    }
}
