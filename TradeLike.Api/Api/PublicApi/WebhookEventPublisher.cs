using System.Text.Json;
using TradeLike.Api.Data;

namespace TradeLike.Api.PublicApi;

public static class WebhookEventPublisher
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static async Task QueueAsync(
        TradeLikeDbContext context,
        int tenantId,
        string eventName,
        object data,
        CancellationToken cancellationToken)
    {
        var subscriptions = await RawSql.QueryAsync(
            context,
            """
            SELECT [Id], [EventsJson]
            FROM [WebhookSubscriptions]
            WHERE [TenantId] = @TenantId AND [IsActive] = 1
            """,
            reader => new WebhookSubscriptionSelection(
                RawSql.ReadInt(reader, "Id"),
                RawSql.ReadString(reader, "EventsJson")),
            cancellationToken,
            new SqlParam("@TenantId", tenantId));

        var payload = JsonSerializer.Serialize(
            new
            {
                id = Guid.NewGuid(),
                eventName,
                createdAtUtc = DateTime.UtcNow,
                data
            },
            JsonOptions);

        foreach (var subscription in subscriptions.Where(subscription => IncludesEvent(subscription.EventsJson, eventName)))
        {
            await RawSql.ExecuteAsync(
                context,
                """
                INSERT INTO [WebhookDeliveries]
                    ([TenantId], [SubscriptionId], [EventName], [Payload], [Status], [AttemptCount], [NextAttemptAtUtc], [CreatedAtUtc])
                VALUES
                    (@TenantId, @SubscriptionId, @EventName, @Payload, N'Pending', 0, SYSUTCDATETIME(), SYSUTCDATETIME())
                """,
                cancellationToken,
                new SqlParam("@TenantId", tenantId),
                new SqlParam("@SubscriptionId", subscription.Id),
                new SqlParam("@EventName", eventName),
                new SqlParam("@Payload", payload));
        }
    }

    private static bool IncludesEvent(string eventsJson, string eventName)
    {
        try
        {
            var events = JsonSerializer.Deserialize<string[]>(eventsJson, JsonOptions) ?? [];
            return events.Contains("*", StringComparer.OrdinalIgnoreCase) ||
                events.Contains(eventName, StringComparer.OrdinalIgnoreCase);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private sealed record WebhookSubscriptionSelection(int Id, string EventsJson);
}
