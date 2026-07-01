using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Data;
using TradeLike.Api.Security;

namespace TradeLike.Api.PublicApi;

[ApiController]
[Authorize(Policy = "RequireDirectorRole")]
[Route("api/webhooks")]
public sealed class WebhooksController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly TradeLikeDbContext _context;

    public WebhooksController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<WebhookSubscriptionResponse>>> List(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);

        var subscriptions = await RawSql.QueryAsync(
            _context,
            """
            SELECT [Id], [TargetUrl], [EventsJson], [IsActive], [CreatedAtUtc], [LastDeliveryAtUtc]
            FROM [WebhookSubscriptions]
            WHERE [TenantId] = @TenantId
            ORDER BY [CreatedAtUtc] DESC
            """,
            reader => new WebhookSubscriptionResponse(
                RawSql.ReadInt(reader, "Id"),
                RawSql.ReadString(reader, "TargetUrl"),
                ReadEvents(RawSql.ReadString(reader, "EventsJson")),
                RawSql.ReadBool(reader, "IsActive"),
                RawSql.ReadDateTime(reader, "CreatedAtUtc") ?? DateTime.UtcNow,
                RawSql.ReadDateTime(reader, "LastDeliveryAtUtc")),
            cancellationToken,
            new SqlParam("@TenantId", tenantId));

        return Ok(subscriptions);
    }

    [HttpPost("subscribe")]
    public async Task<ActionResult<CreateWebhookSubscriptionResponse>> Subscribe(
        [FromBody] CreateWebhookSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);

        if (!Uri.TryCreate(request.TargetUrl, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            return BadRequest(new { error = "Target URL must be an absolute HTTP or HTTPS URL." });
        }

        var events = ResolveEvents(request.Events);
        var eventsJson = JsonSerializer.Serialize(events, JsonOptions);
        var signingSecret = $"whsec_{Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant()}";

        var id = await RawSql.ScalarAsync(
            _context,
            """
            INSERT INTO [WebhookSubscriptions]
                ([TenantId], [TargetUrl], [EventsJson], [SigningSecret], [IsActive], [CreatedAtUtc])
            OUTPUT INSERTED.[Id]
            VALUES
                (@TenantId, @TargetUrl, @EventsJson, @SigningSecret, 1, SYSUTCDATETIME())
            """,
            cancellationToken,
            new SqlParam("@TenantId", tenantId),
            new SqlParam("@TargetUrl", uri.ToString()),
            new SqlParam("@EventsJson", eventsJson),
            new SqlParam("@SigningSecret", signingSecret));

        return CreatedAtAction(
            nameof(List),
            routeValues: null,
            value: new CreateWebhookSubscriptionResponse(
                Convert.ToInt32(id),
                uri.ToString(),
                events,
                signingSecret,
                true,
                DateTime.UtcNow));
    }

    [HttpPost("{id:int}/test")]
    public async Task<IActionResult> SendTest(int id, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var subscriptionExists = await RawSql.ScalarAsync(
            _context,
            """
            SELECT TOP 1 [Id]
            FROM [WebhookSubscriptions]
            WHERE [Id] = @Id AND [TenantId] = @TenantId AND [IsActive] = 1
            """,
            cancellationToken,
            new SqlParam("@Id", id),
            new SqlParam("@TenantId", tenantId));

        if (subscriptionExists is null)
        {
            return NotFound();
        }

        var payload = JsonSerializer.Serialize(
            new
            {
                id = Guid.NewGuid(),
                eventName = "webhook.test",
                createdAtUtc = DateTime.UtcNow,
                data = new { message = "Webhook test delivery queued.", subscriptionId = id }
            },
            JsonOptions);

        await RawSql.ExecuteAsync(
            _context,
            """
            INSERT INTO [WebhookDeliveries]
                ([TenantId], [SubscriptionId], [EventName], [Payload], [Status], [AttemptCount], [NextAttemptAtUtc], [CreatedAtUtc])
            VALUES
                (@TenantId, @SubscriptionId, N'webhook.test', @Payload, N'Pending', 0, SYSUTCDATETIME(), SYSUTCDATETIME())
            """,
            cancellationToken,
            new SqlParam("@TenantId", tenantId),
            new SqlParam("@SubscriptionId", id),
            new SqlParam("@Payload", payload));

        return Accepted(new { message = "Test webhook queued." });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Disable(int id, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var affected = await RawSql.ExecuteAsync(
            _context,
            """
            UPDATE [WebhookSubscriptions]
            SET [IsActive] = 0
            WHERE [Id] = @Id AND [TenantId] = @TenantId
            """,
            cancellationToken,
            new SqlParam("@Id", id),
            new SqlParam("@TenantId", tenantId));

        return affected == 0 ? NotFound() : NoContent();
    }

    private static string[] ResolveEvents(IReadOnlyCollection<string>? events)
    {
        if (events is null || events.Count == 0)
        {
            return PublicApiConstants.SupportedWebhookEvents
                .Where(eventName => eventName != "webhook.test")
                .ToArray();
        }

        var supported = PublicApiConstants.SupportedWebhookEvents.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return events
            .Select(eventName => eventName.Trim())
            .Where(eventName => eventName.Length > 0 && (eventName == "*" || supported.Contains(eventName)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .DefaultIfEmpty("import.completed")
            .ToArray();
    }

    private static string[] ReadEvents(string eventsJson)
    {
        try
        {
            return JsonSerializer.Deserialize<string[]>(eventsJson, JsonOptions) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}

public sealed record CreateWebhookSubscriptionRequest(string TargetUrl, IReadOnlyCollection<string>? Events);

public sealed record WebhookSubscriptionResponse(
    int Id,
    string TargetUrl,
    IReadOnlyCollection<string> Events,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime? LastDeliveryAtUtc);

public sealed record CreateWebhookSubscriptionResponse(
    int Id,
    string TargetUrl,
    IReadOnlyCollection<string> Events,
    string SigningSecret,
    bool IsActive,
    DateTime CreatedAtUtc);
