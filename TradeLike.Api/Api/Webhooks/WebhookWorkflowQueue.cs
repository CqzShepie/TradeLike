using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Api.Webhooks;

public static class WebhookWorkflowQueue
{
    private const int PermitLimit = 30;
    private static readonly ConcurrentDictionary<int, RateWindow> Windows = new();

    public static async Task<int> QueueAsync(
        TradeLikeDbContext context,
        int tenantId,
        string eventName,
        JsonElement payload,
        CancellationToken cancellationToken)
    {
        var workflows = await context.WebhookWorkflows
            .Where(workflow => workflow.TenantId == tenantId && workflow.Enabled && workflow.TriggerEvent == eventName)
            .ToListAsync(cancellationToken);

        var queued = 0;
        foreach (var workflow in workflows)
        {
            if (!WebhookWorkflowEngine.Matches(workflow.FilterJson, payload))
            {
                continue;
            }

            var transformed = WebhookWorkflowEngine.Transform(workflow.TransformJson, payload);
            var availableAt = TryAcquire(workflow.Id, out var retryAt) ? DateTime.UtcNow : retryAt;

            context.WebhookWorkflowDeliveries.Add(new WebhookWorkflowDelivery
            {
                TenantId = tenantId,
                WebhookWorkflowId = workflow.Id,
                EventName = eventName,
                PayloadJson = JsonSerializer.Serialize(transformed),
                Status = "Pending",
                AttemptCount = 0,
                AvailableAtUtc = availableAt,
                CreatedAtUtc = DateTime.UtcNow
            });

            workflow.LastQueuedAtUtc = DateTime.UtcNow;
            queued++;
        }

        await context.SaveChangesAsync(cancellationToken);
        return queued;
    }

    private static bool TryAcquire(int workflowId, out DateTime retryAt)
    {
        var now = DateTime.UtcNow;
        var window = Windows.GetOrAdd(workflowId, _ => new RateWindow(now));

        lock (window)
        {
            if (now - window.StartedAtUtc >= TimeSpan.FromMinutes(1))
            {
                window.StartedAtUtc = now;
                window.Count = 0;
            }

            if (window.Count >= PermitLimit)
            {
                retryAt = window.StartedAtUtc.AddMinutes(1);
                return false;
            }

            window.Count++;
            retryAt = now;
            return true;
        }
    }

    private sealed class RateWindow
    {
        public RateWindow(DateTime startedAtUtc)
        {
            StartedAtUtc = startedAtUtc;
        }

        public DateTime StartedAtUtc { get; set; }

        public int Count { get; set; }
    }
}
