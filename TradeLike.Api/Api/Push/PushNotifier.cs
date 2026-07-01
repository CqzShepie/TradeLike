using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;

namespace TradeLike.Api.Api.Push;

public sealed class PushDomainEventQueue
{
    private readonly Channel<PushDomainEvent> _channel = Channel.CreateUnbounded<PushDomainEvent>();

    public ValueTask PublishAsync(PushDomainEvent domainEvent, CancellationToken cancellationToken = default)
    {
        return _channel.Writer.WriteAsync(domainEvent, cancellationToken);
    }

    public IAsyncEnumerable<PushDomainEvent> ReadAllAsync(CancellationToken cancellationToken)
    {
        return _channel.Reader.ReadAllAsync(cancellationToken);
    }
}

public sealed class PushNotifier : BackgroundService
{
    private readonly PushDomainEventQueue _events;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly ILogger<PushNotifier> _logger;

    public PushNotifier(
        PushDomainEventQueue events,
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        HttpClient httpClient,
        ILogger<PushNotifier> logger)
    {
        _events = events;
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _httpClient = httpClient;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var domainEvent in _events.ReadAllAsync(stoppingToken))
        {
            try
            {
                await SendAsync(domainEvent, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to send push notification for {EventType}.", domainEvent.Type);
            }
        }
    }

    private async Task SendAsync(PushDomainEvent domainEvent, CancellationToken cancellationToken)
    {
        var serverKey = _configuration["FCM_SERVER_KEY"];
        if (string.IsNullOrWhiteSpace(serverKey))
        {
            _logger.LogDebug("FCM_SERVER_KEY is not configured; push event {EventType} was skipped.", domainEvent.Type);
            return;
        }

        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<TradeLikeDbContext>();
        var subscriptions = await db.PushSubscriptions
            .AsNoTracking()
            .Where(item => item.TenantId == domainEvent.TenantId &&
                (!domainEvent.UserId.HasValue || item.UserId == domainEvent.UserId.Value))
            .ToListAsync(cancellationToken);

        foreach (var subscription in subscriptions)
        {
            var payload = JsonSerializer.Serialize(new
            {
                to = subscription.Endpoint,
                notification = new
                {
                    title = domainEvent.Title,
                    body = domainEvent.Body
                },
                data = new
                {
                    type = domainEvent.Type,
                    url = domainEvent.Url
                }
            });

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://fcm.googleapis.com/fcm/send")
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json")
            };
            request.Headers.TryAddWithoutValidation("Authorization", $"key={serverKey}");
            await _httpClient.SendAsync(request, cancellationToken);
        }
    }
}

public sealed record PushDomainEvent(
    int TenantId,
    int? UserId,
    string Type,
    string Title,
    string Body,
    string? Url);
