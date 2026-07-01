using System.Text.Json;

namespace TradeLike.Api.Api.Webhooks;

public static class WebhookWorkflowEngine
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static bool Matches(string filterJson, JsonElement payload)
    {
        if (string.IsNullOrWhiteSpace(filterJson) || filterJson.Trim() == "{}")
        {
            return true;
        }

        using var document = JsonDocument.Parse(filterJson);
        return MatchesRule(document.RootElement, payload);
    }

    public static JsonElement Transform(string transformJson, JsonElement payload)
    {
        if (string.IsNullOrWhiteSpace(transformJson) || transformJson.Trim() == "{}")
        {
            return payload.Clone();
        }

        using var transform = JsonDocument.Parse(transformJson);
        if (!transform.RootElement.TryGetProperty("fields", out var fields) || fields.ValueKind != JsonValueKind.Array)
        {
            return payload.Clone();
        }

        var output = new Dictionary<string, object?>();
        if (transform.RootElement.TryGetProperty("includeOriginal", out var includeOriginal) &&
            includeOriginal.ValueKind == JsonValueKind.True)
        {
            output["original"] = JsonSerializer.Deserialize<object>(payload.GetRawText(), JsonOptions);
        }

        foreach (var field in fields.EnumerateArray())
        {
            if (!field.TryGetProperty("target", out var targetElement) || targetElement.ValueKind != JsonValueKind.String)
            {
                continue;
            }

            var target = targetElement.GetString();
            if (string.IsNullOrWhiteSpace(target))
            {
                continue;
            }

            if (field.TryGetProperty("constant", out var constant))
            {
                output[target] = JsonSerializer.Deserialize<object>(constant.GetRawText(), JsonOptions);
                continue;
            }

            if (field.TryGetProperty("source", out var sourceElement) &&
                sourceElement.ValueKind == JsonValueKind.String &&
                TryReadPath(payload, sourceElement.GetString() ?? string.Empty, out var value))
            {
                output[target] = JsonSerializer.Deserialize<object>(value.GetRawText(), JsonOptions);
            }
        }

        return JsonSerializer.SerializeToElement(output, JsonOptions);
    }

    private static bool MatchesRule(JsonElement rule, JsonElement payload)
    {
        if (rule.ValueKind != JsonValueKind.Object)
        {
            return true;
        }

        if (rule.TryGetProperty("rules", out var rules) && rules.ValueKind == JsonValueKind.Array)
        {
            var mode = rule.TryGetProperty("mode", out var modeElement) && modeElement.ValueKind == JsonValueKind.String
                ? modeElement.GetString()
                : "AND";
            var results = rules.EnumerateArray().Select(child => MatchesRule(child, payload)).ToList();
            return string.Equals(mode, "OR", StringComparison.OrdinalIgnoreCase)
                ? results.Any(result => result)
                : results.All(result => result);
        }

        var field = rule.TryGetProperty("field", out var fieldElement) ? fieldElement.GetString() : null;
        var op = rule.TryGetProperty("operator", out var operatorElement) ? operatorElement.GetString() : "==";
        if (string.IsNullOrWhiteSpace(field) || !TryReadPath(payload, field, out var actual))
        {
            return false;
        }

        var expected = rule.TryGetProperty("value", out var valueElement)
            ? valueElement.ToString()
            : string.Empty;
        var actualValue = actual.ToString();

        return op switch
        {
            "!=" or "notEquals" => !string.Equals(actualValue, expected, StringComparison.OrdinalIgnoreCase),
            "contains" => actualValue.Contains(expected, StringComparison.OrdinalIgnoreCase),
            "exists" => actual.ValueKind is not JsonValueKind.Null and not JsonValueKind.Undefined,
            _ => string.Equals(actualValue, expected, StringComparison.OrdinalIgnoreCase)
        };
    }

    private static bool TryReadPath(JsonElement root, string path, out JsonElement value)
    {
        value = root;
        foreach (var segment in path.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (value.ValueKind != JsonValueKind.Object || !value.TryGetProperty(segment, out value))
            {
                return false;
            }
        }

        return true;
    }
}
