using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using TradeLike.Api.Data;

namespace TradeLike.Api.PublicApi;

public sealed class WebhookDispatcher : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WebhookDispatcher> _logger;

    public WebhookDispatcher(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        ILogger<WebhookDispatcher> logger)
    {
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DispatchBatchAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Webhook dispatch batch failed.");
            }

            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        }
    }

    private async Task DispatchBatchAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<TradeLikeDbContext>();
        var httpClient = _httpClientFactory.CreateClient(nameof(WebhookDispatcher));

        var deliveries = await RawSql.QueryAsync(
            context,
            """
            SELECT TOP 20
                d.[Id],
                d.[TenantId],
                d.[SubscriptionId],
                d.[EventName],
                d.[Payload],
                d.[AttemptCount],
                s.[TargetUrl],
                s.[SigningSecret]
            FROM [WebhookDeliveries] d
            INNER JOIN [WebhookSubscriptions] s ON s.[Id] = d.[SubscriptionId]
            WHERE d.[Status] IN (N'Pending', N'Failed')
                AND d.[NextAttemptAtUtc] <= SYSUTCDATETIME()
                AND s.[IsActive] = 1
            ORDER BY d.[CreatedAtUtc]
            """,
            reader => new WebhookDeliveryWorkItem(
                RawSql.ReadInt(reader, "Id"),
                RawSql.ReadInt(reader, "TenantId"),
                RawSql.ReadInt(reader, "SubscriptionId"),
                RawSql.ReadString(reader, "EventName"),
                RawSql.ReadString(reader, "Payload"),
                RawSql.ReadInt(reader, "AttemptCount"),
                RawSql.ReadString(reader, "TargetUrl"),
                RawSql.ReadString(reader, "SigningSecret")),
            cancellationToken);

        foreach (var delivery in deliveries)
        {
            await DispatchAsync(context, httpClient, delivery, cancellationToken);
        }
    }

    private async Task DispatchAsync(
        TradeLikeDbContext context,
        HttpClient httpClient,
        WebhookDeliveryWorkItem delivery,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, delivery.TargetUrl);
        request.Content = new StringContent(delivery.Payload, Encoding.UTF8, "application/json");
        request.Headers.Add("X-TradeLike-Event", delivery.EventName);
        request.Headers.Add("X-TradeLike-Delivery", delivery.Id.ToString());
        request.Headers.Authorization = new AuthenticationHeaderValue("Webhook", CreateSignature(delivery.SigningSecret, delivery.Payload));

        try
        {
            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                await RawSql.ExecuteAsync(
                    context,
                    """
                    UPDATE [WebhookDeliveries]
                    SET [Status] = N'Delivered',
                        [AttemptCount] = [AttemptCount] + 1,
                        [LastAttemptAtUtc] = SYSUTCDATETIME(),
                        [LastError] = NULL
                    WHERE [Id] = @Id

                    UPDATE [WebhookSubscriptions]
                    SET [LastDeliveryAtUtc] = SYSUTCDATETIME()
                    WHERE [Id] = @SubscriptionId
                    """,
                    cancellationToken,
                    new SqlParam("@Id", delivery.Id),
                    new SqlParam("@SubscriptionId", delivery.SubscriptionId));

                return;
            }

            await MarkFailedAsync(context, delivery, $"HTTP {(int)response.StatusCode}", cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            await MarkFailedAsync(context, delivery, ex.Message, cancellationToken);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            await MarkFailedAsync(context, delivery, ex.Message, cancellationToken);
        }
    }

    private static async Task MarkFailedAsync(
        TradeLikeDbContext context,
        WebhookDeliveryWorkItem delivery,
        string error,
        CancellationToken cancellationToken)
    {
        var nextDelaySeconds = Math.Min(3600, (int)Math.Pow(2, Math.Min(delivery.AttemptCount + 1, 10)) * 30);

        await RawSql.ExecuteAsync(
            context,
            """
            UPDATE [WebhookDeliveries]
            SET [Status] = N'Failed',
                [AttemptCount] = [AttemptCount] + 1,
                [LastAttemptAtUtc] = SYSUTCDATETIME(),
                [LastError] = @LastError,
                [NextAttemptAtUtc] = DATEADD(second, @DelaySeconds, SYSUTCDATETIME())
            WHERE [Id] = @Id
            """,
            cancellationToken,
            new SqlParam("@Id", delivery.Id),
            new SqlParam("@LastError", error),
            new SqlParam("@DelaySeconds", nextDelaySeconds));
    }

    private static string CreateSignature(string signingSecret, string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(signingSecret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }

    private sealed record WebhookDeliveryWorkItem(
        int Id,
        int TenantId,
        int SubscriptionId,
        string EventName,
        string Payload,
        int AttemptCount,
        string TargetUrl,
        string SigningSecret);
}
