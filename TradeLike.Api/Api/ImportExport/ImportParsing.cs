using System.Text;
using System.Text.Json;

namespace TradeLike.Api.ImportExport;

internal sealed record ParsedImportRow(
    int RowNumber,
    IReadOnlyDictionary<string, string> Values,
    string RawRow);

internal static class ImportParsing
{
    public static IReadOnlyList<ParsedImportRow> Parse(string content)
    {
        return content.TrimStart().StartsWith("[", StringComparison.Ordinal)
            ? ParseJson(content)
            : ParseCsv(content);
    }

    public static string? Get(ParsedImportRow row, params string[] keys)
    {
        foreach (var key in keys)
        {
            var normalized = Normalize(key);
            if (row.Values.TryGetValue(normalized, out var value) && !string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return null;
    }

    private static IReadOnlyList<ParsedImportRow> ParseJson(string content)
    {
        using var document = JsonDocument.Parse(content);
        if (document.RootElement.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException("JSON import payload must be an array of objects.");
        }

        var rows = new List<ParsedImportRow>();
        var rowNumber = 1;

        foreach (var element in document.RootElement.EnumerateArray())
        {
            if (element.ValueKind != JsonValueKind.Object)
            {
                throw new InvalidOperationException("Each JSON import row must be an object.");
            }

            var values = element.EnumerateObject()
                .ToDictionary(
                    property => Normalize(property.Name),
                    property => property.Value.ValueKind == JsonValueKind.String
                        ? property.Value.GetString() ?? string.Empty
                        : property.Value.ToString(),
                    StringComparer.OrdinalIgnoreCase);

            rows.Add(new ParsedImportRow(rowNumber, values, element.GetRawText()));
            rowNumber++;
        }

        return rows;
    }

    private static IReadOnlyList<ParsedImportRow> ParseCsv(string content)
    {
        var records = ReadCsvRecords(content).ToList();
        if (records.Count < 2)
        {
            return [];
        }

        var headers = records[0].Fields.Select(Normalize).ToArray();
        var rows = new List<ParsedImportRow>();

        for (var index = 1; index < records.Count; index++)
        {
            var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (var column = 0; column < headers.Length; column++)
            {
                values[headers[column]] = column < records[index].Fields.Count ? records[index].Fields[column] : string.Empty;
            }

            rows.Add(new ParsedImportRow(index + 1, values, records[index].Raw));
        }

        return rows;
    }

    private static IEnumerable<CsvRecord> ReadCsvRecords(string content)
    {
        var fields = new List<string>();
        var field = new StringBuilder();
        var raw = new StringBuilder();
        var inQuotes = false;

        for (var index = 0; index < content.Length; index++)
        {
            var current = content[index];
            raw.Append(current);

            if (current == '"')
            {
                if (inQuotes && index + 1 < content.Length && content[index + 1] == '"')
                {
                    field.Append('"');
                    raw.Append(content[index + 1]);
                    index++;
                    continue;
                }

                inQuotes = !inQuotes;
                continue;
            }

            if (current == ',' && !inQuotes)
            {
                fields.Add(field.ToString());
                field.Clear();
                continue;
            }

            if ((current == '\r' || current == '\n') && !inQuotes)
            {
                if (current == '\r' && index + 1 < content.Length && content[index + 1] == '\n')
                {
                    raw.Append(content[index + 1]);
                    index++;
                }

                fields.Add(field.ToString());
                yield return new CsvRecord(fields, raw.ToString().TrimEnd('\r', '\n'));
                fields = [];
                field.Clear();
                raw.Clear();
                continue;
            }

            field.Append(current);
        }

        if (field.Length > 0 || fields.Count > 0)
        {
            fields.Add(field.ToString());
            yield return new CsvRecord(fields, raw.ToString());
        }
    }

    private static string Normalize(string value)
    {
        var builder = new StringBuilder(value.Length);
        foreach (var character in value.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(character))
            {
                builder.Append(character);
            }
        }

        return builder.ToString();
    }

    private sealed record CsvRecord(IReadOnlyList<string> Fields, string Raw);
}
