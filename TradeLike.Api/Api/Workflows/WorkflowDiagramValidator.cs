using System.Text.Json;

namespace TradeLike.Api.Api.Workflows;

public static class WorkflowDiagramValidator
{
    public static IReadOnlyList<string> Validate(WorkflowDiagramRequest diagram)
    {
        var errors = new List<string>();

        if (diagram.Nodes.Count == 0)
        {
            errors.Add("Diagram must contain at least one node.");
            return errors;
        }

        var nodeById = diagram.Nodes.ToDictionary(node => node.Id, StringComparer.OrdinalIgnoreCase);
        var triggers = diagram.Nodes
            .Where(node => string.Equals(node.Type, "Trigger", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (triggers.Count == 0)
        {
            errors.Add("Diagram must contain at least one Trigger node.");
        }

        if (!diagram.Nodes.Any(node => string.Equals(node.Type, "Action", StringComparison.OrdinalIgnoreCase)))
        {
            errors.Add("Diagram must contain at least one Action node.");
        }

        foreach (var edge in diagram.Edges)
        {
            if (!nodeById.ContainsKey(edge.Source))
            {
                errors.Add($"Edge source '{edge.Source}' does not exist.");
            }

            if (!nodeById.ContainsKey(edge.Target))
            {
                errors.Add($"Edge target '{edge.Target}' does not exist.");
            }
        }

        foreach (var condition in diagram.Nodes.Where(node => string.Equals(node.Type, "Condition", StringComparison.OrdinalIgnoreCase)))
        {
            var mode = ReadConditionMode(condition.Data);
            if (mode is not "AND" and not "OR")
            {
                errors.Add($"Condition node '{condition.Id}' must use AND or OR groups.");
            }
        }

        if (errors.Count == 0 && !HasReachableAction(triggers, diagram.Edges, nodeById))
        {
            errors.Add("At least one Action must be reachable from a Trigger.");
        }

        return errors;
    }

    private static bool HasReachableAction(
        IReadOnlyList<WorkflowDiagramNode> triggers,
        IReadOnlyList<WorkflowDiagramEdge> edges,
        IReadOnlyDictionary<string, WorkflowDiagramNode> nodes)
    {
        var adjacency = edges
            .GroupBy(edge => edge.Source, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.Select(edge => edge.Target).ToList(), StringComparer.OrdinalIgnoreCase);

        foreach (var trigger in triggers)
        {
            var queue = new Queue<string>();
            var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            queue.Enqueue(trigger.Id);

            while (queue.Count > 0)
            {
                var current = queue.Dequeue();
                if (!visited.Add(current))
                {
                    continue;
                }

                if (!string.Equals(current, trigger.Id, StringComparison.OrdinalIgnoreCase) &&
                    nodes.TryGetValue(current, out var node) &&
                    string.Equals(node.Type, "Action", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                if (!adjacency.TryGetValue(current, out var next))
                {
                    continue;
                }

                foreach (var target in next)
                {
                    queue.Enqueue(target);
                }
            }
        }

        return false;
    }

    private static string? ReadConditionMode(JsonElement data)
    {
        if (data.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (data.TryGetProperty("mode", out var mode) && mode.ValueKind == JsonValueKind.String)
        {
            return mode.GetString()?.Trim().ToUpperInvariant();
        }

        if (data.TryGetProperty("group", out var group) &&
            group.ValueKind == JsonValueKind.Object &&
            group.TryGetProperty("operator", out var groupOperator) &&
            groupOperator.ValueKind == JsonValueKind.String)
        {
            return groupOperator.GetString()?.Trim().ToUpperInvariant();
        }

        return null;
    }
}

public sealed record WorkflowDiagramRequest(
    IReadOnlyList<WorkflowDiagramNode> Nodes,
    IReadOnlyList<WorkflowDiagramEdge> Edges);

public sealed record WorkflowDiagramNode(
    string Id,
    string Type,
    JsonElement Data);

public sealed record WorkflowDiagramEdge(
    string Id,
    string Source,
    string Target);
