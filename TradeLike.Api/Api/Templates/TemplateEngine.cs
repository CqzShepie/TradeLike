using System.Globalization;
using System.Reflection;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Api.Templates;

public sealed class TemplateEngine
{
    private static readonly Regex PlaceholderPattern = new(@"\{\{\s*([A-Za-z0-9_.]+)\s*\}\}", RegexOptions.Compiled);
    private readonly TradeLikeDbContext _context;

    public TemplateEngine(TradeLikeDbContext context)
    {
        _context = context;
    }

    public string Render(string template, IReadOnlyDictionary<string, object?> values)
    {
        return PlaceholderPattern.Replace(template, match =>
        {
            var key = match.Groups[1].Value;
            return HtmlEncoder.Default.Encode(ResolveValue(key, values));
        });
    }

    public async Task<string> RenderForEntityAsync(
        DocumentTemplate template,
        GeneratedDocumentEntityType entityType,
        int entityId,
        int tenantId,
        CancellationToken cancellationToken)
    {
        var values = await BuildValuesAsync(entityType, entityId, tenantId, cancellationToken);
        return Render(template.HtmlTemplate, values);
    }

    private async Task<IReadOnlyDictionary<string, object?>> BuildValuesAsync(
        GeneratedDocumentEntityType entityType,
        int entityId,
        int tenantId,
        CancellationToken cancellationToken)
    {
        return entityType switch
        {
            GeneratedDocumentEntityType.Quote => new Dictionary<string, object?>
            {
                ["Quote"] = await _context.Quotes
                    .AsNoTracking()
                    .FirstOrDefaultAsync(quote => quote.Id == entityId && quote.TenantId == tenantId, cancellationToken),
                ["GeneratedAtUtc"] = DateTime.UtcNow
            },
            GeneratedDocumentEntityType.Invoice => new Dictionary<string, object?>
            {
                ["Invoice"] = await _context.Invoices
                    .AsNoTracking()
                    .FirstOrDefaultAsync(invoice => invoice.Id == entityId && invoice.TenantId == tenantId, cancellationToken),
                ["GeneratedAtUtc"] = DateTime.UtcNow
            },
            GeneratedDocumentEntityType.Job => new Dictionary<string, object?>
            {
                ["Job"] = await _context.Jobs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(job => job.Id == entityId && job.TenantId == tenantId, cancellationToken),
                ["GeneratedAtUtc"] = DateTime.UtcNow
            },
            _ => new Dictionary<string, object?>
            {
                ["Certificate"] = new { Id = entityId },
                ["GeneratedAtUtc"] = DateTime.UtcNow
            }
        };
    }

    private static string ResolveValue(string key, IReadOnlyDictionary<string, object?> values)
    {
        var parts = key.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length == 0 || !values.TryGetValue(parts[0], out var current) || current is null)
        {
            return string.Empty;
        }

        foreach (var part in parts.Skip(1))
        {
            current = ResolveMember(current, part);
            if (current is null)
            {
                return string.Empty;
            }
        }

        return current switch
        {
            IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
            _ => current.ToString() ?? string.Empty
        };
    }

    private static object? ResolveMember(object source, string memberName)
    {
        if (source is IReadOnlyDictionary<string, object?> dictionary &&
            dictionary.TryGetValue(memberName, out var dictionaryValue))
        {
            return dictionaryValue;
        }

        return source
            .GetType()
            .GetProperty(memberName, BindingFlags.Instance | BindingFlags.Public | BindingFlags.IgnoreCase)
            ?.GetValue(source);
    }
}
