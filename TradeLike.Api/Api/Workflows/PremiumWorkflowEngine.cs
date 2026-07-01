using System.Text.Json;

namespace TradeLike.Api.Workflows;

public static class PremiumWorkflowEngine
{
    public static readonly string[] PremiumTriggers = ["InvoicePaid", "JobOverdue"];

    public static readonly string[] PremiumActions = ["SendWebhook", "ApplyDiscount", "ChangeJobStatus"];

    public static IReadOnlyList<WorkflowActionLog> BuildInvoicePaidLogs(JsonElement definition, int invoiceId)
    {
        if (!ContainsNode(definition, "InvoicePaid") || !ContainsNode(definition, "ApplyDiscount"))
        {
            return [];
        }

        return [new WorkflowActionLog("InvoicePaid", "ApplyDiscount", invoiceId, "ApplyDiscount queued after invoice payment.")];
    }

    public static bool ContainsNode(JsonElement definition, string nodeType)
    {
        if (definition.ValueKind != JsonValueKind.Object ||
            !definition.TryGetProperty("nodes", out var nodes) ||
            nodes.ValueKind != JsonValueKind.Array)
        {
            return false;
        }

        foreach (var node in nodes.EnumerateArray())
        {
            if (node.TryGetProperty("type", out var typeElement) &&
                string.Equals(typeElement.GetString(), nodeType, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}

public sealed record WorkflowActionLog(string Trigger, string Action, int EntityId, string Message);
