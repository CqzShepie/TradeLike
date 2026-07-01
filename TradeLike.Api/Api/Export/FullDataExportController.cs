using System.IO.Compression;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Export;

[ApiController]
[Authorize(Policy = "RequireDirectorRole")]
[Route("api/export")]
public sealed class FullDataExportController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public FullDataExportController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet("full")]
    public async Task<IActionResult> ExportFull([FromQuery] string format = "csv", CancellationToken cancellationToken = default)
    {
        if (!string.Equals(format, "csv", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "Only csv format is supported." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var userId = GetUserId(HttpContext);
        var subscription = await _context.Subscriptions
            .AsNoTracking()
            .Include(item => item.Plan)
            .FirstOrDefaultAsync(item => item.TenantId == tenantId, cancellationToken);

        var planName = subscription?.Plan?.Name ?? "Solo";
        var gate = await FullExportRateLimiter.EvaluateAsync(_context, tenantId, planName, DateTime.UtcNow, cancellationToken);
        if (!gate.Allowed)
        {
            return StatusCode(gate.StatusCode, new { error = gate.Message, retryAfterUtc = gate.RetryAfterUtc });
        }

        _context.FullDataExportLogs.Add(new FullDataExportLog
        {
            TenantId = tenantId,
            RequestedById = userId,
            PlanName = planName,
            CreatedAtUtc = DateTime.UtcNow
        });
        await _context.SaveChangesAsync(cancellationToken);

        await using var stream = new MemoryStream();
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
        {
            await AddCsvAsync(archive, "customers.csv", await CustomerRowsAsync(tenantId, cancellationToken), cancellationToken);
            await AddCsvAsync(archive, "jobs.csv", await JobRowsAsync(tenantId, cancellationToken), cancellationToken);
            await AddCsvAsync(archive, "quotes.csv", await QuoteRowsAsync(tenantId, cancellationToken), cancellationToken);
            await AddCsvAsync(archive, "invoices.csv", await InvoiceRowsAsync(tenantId, cancellationToken), cancellationToken);
            await AddCsvAsync(archive, "stock.csv", await StockRowsAsync(tenantId, cancellationToken), cancellationToken);
        }

        return File(stream.ToArray(), "application/zip", $"tradelike-full-export-{DateTime.UtcNow:yyyyMMddHHmmss}.zip");
    }

    private async Task<IReadOnlyList<IReadOnlyList<string>>> CustomerRowsAsync(int tenantId, CancellationToken cancellationToken)
    {
        var rows = await _context.Customers
            .AsNoTracking()
            .Where(item => item.TenantId == tenantId)
            .OrderBy(item => item.Name)
            .Select(item => new[] { item.Id.ToString(), item.Name, item.Email, item.Phone, item.Address, item.Notes ?? string.Empty })
            .ToListAsync(cancellationToken);

        return WithHeader(new[] { "id", "name", "email", "phone", "address", "notes" }, rows);
    }

    private async Task<IReadOnlyList<IReadOnlyList<string>>> JobRowsAsync(int tenantId, CancellationToken cancellationToken)
    {
        var rows = await _context.Jobs
            .AsNoTracking()
            .Where(item => item.TenantId == tenantId)
            .OrderByDescending(item => item.ScheduledDate)
            .Select(item => new[]
            {
                item.Id.ToString(),
                item.Customer,
                item.JobTitle,
                item.Address,
                item.ScheduledDate.ToString("O"),
                item.Status,
                item.Priority,
                item.Notes ?? string.Empty
            })
            .ToListAsync(cancellationToken);

        return WithHeader(new[] { "id", "customer", "title", "address", "scheduled_date", "status", "priority", "notes" }, rows);
    }

    private async Task<IReadOnlyList<IReadOnlyList<string>>> QuoteRowsAsync(int tenantId, CancellationToken cancellationToken)
    {
        var rows = await _context.Quotes
            .AsNoTracking()
            .Where(item => item.TenantId == tenantId)
            .OrderByDescending(item => item.CreatedAt)
            .Select(item => new[]
            {
                item.Id.ToString(),
                item.CustomerId.ToString(),
                item.CustomerName,
                item.Title,
                item.Status,
                item.Total.ToString(),
                item.CreatedAt.ToString("O")
            })
            .ToListAsync(cancellationToken);

        return WithHeader(new[] { "id", "customer_id", "customer_name", "title", "status", "total", "created_at" }, rows);
    }

    private async Task<IReadOnlyList<IReadOnlyList<string>>> InvoiceRowsAsync(int tenantId, CancellationToken cancellationToken)
    {
        var rows = await _context.Invoices
            .AsNoTracking()
            .Where(item => item.TenantId == tenantId)
            .OrderByDescending(item => item.CreatedAt)
            .Select(item => new[]
            {
                item.Id.ToString(),
                item.InvoiceNumber,
                item.CustomerName,
                item.Title,
                item.Status,
                item.TotalPence.ToString(),
                item.DueDate.ToString("O"),
                item.PaidAt.HasValue ? item.PaidAt.Value.ToString("O") : string.Empty,
                item.CreatedAt.ToString("O")
            })
            .ToListAsync(cancellationToken);

        return WithHeader(new[] { "id", "invoice_number", "customer_name", "title", "status", "total_pence", "due_date", "paid_at", "created_at" }, rows);
    }

    private async Task<IReadOnlyList<IReadOnlyList<string>>> StockRowsAsync(int tenantId, CancellationToken cancellationToken)
    {
        var rows = await _context.Products
            .AsNoTracking()
            .Where(item => item.TenantId == tenantId)
            .OrderBy(item => item.Name)
            .Select(item => new[] { item.Id.ToString(), item.Sku, item.Name })
            .ToListAsync(cancellationToken);

        return WithHeader(new[] { "id", "sku", "name" }, rows);
    }

    private static IReadOnlyList<IReadOnlyList<string>> WithHeader(string[] header, List<string[]> rows)
    {
        var allRows = new List<IReadOnlyList<string>> { header };
        allRows.AddRange(rows);
        return allRows;
    }

    private static async Task AddCsvAsync(
        ZipArchive archive,
        string fileName,
        IReadOnlyList<IReadOnlyList<string>> rows,
        CancellationToken cancellationToken)
    {
        var entry = archive.CreateEntry(fileName, CompressionLevel.Fastest);
        await using var writer = new StreamWriter(entry.Open(), Encoding.UTF8);
        foreach (var row in rows)
        {
            await writer.WriteLineAsync(string.Join(",", row.Select(EscapeCsv)));
            cancellationToken.ThrowIfCancellationRequested();
        }
    }

    private static string EscapeCsv(string value)
    {
        var safe = value ?? string.Empty;
        return safe.Contains('"') || safe.Contains(',') || safe.Contains('\n') || safe.Contains('\r')
            ? $"\"{safe.Replace("\"", "\"\"", StringComparison.Ordinal)}\""
            : safe;
    }

    private static int GetUserId(HttpContext context)
    {
        var raw = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(raw, out var userId) ? userId : 0;
    }
}

public static class FullExportRateLimiter
{
    public static async Task<FullExportGateResult> EvaluateAsync(
        TradeLikeDbContext context,
        int tenantId,
        string planName,
        DateTime nowUtc,
        CancellationToken cancellationToken)
    {
        var normalized = planName.Trim().ToLowerInvariant();
        if (normalized is "solo" or "team")
        {
            return FullExportGateResult.Blocked(402, "Full data export is available on Business and Enterprise plans.", null);
        }

        if (normalized == "business")
        {
            var since = nowUtc.AddHours(-24);
            var last = await context.FullDataExportLogs
                .AsNoTracking()
                .Where(item => item.TenantId == tenantId && item.CreatedAtUtc >= since)
                .OrderByDescending(item => item.CreatedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);

            if (last is not null)
            {
                return FullExportGateResult.Blocked(429, "Business plans can run one full export per day.", last.CreatedAtUtc.AddHours(24));
            }
        }

        if (normalized == "enterprise")
        {
            var since = nowUtc.AddMinutes(-15);
            var last = await context.FullDataExportLogs
                .AsNoTracking()
                .Where(item => item.TenantId == tenantId && item.CreatedAtUtc >= since)
                .OrderByDescending(item => item.CreatedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);

            if (last is not null)
            {
                return FullExportGateResult.Blocked(429, "Enterprise exports have a 15 minute cooldown.", last.CreatedAtUtc.AddMinutes(15));
            }
        }

        return FullExportGateResult.AllowedResult();
    }
}

public sealed record FullExportGateResult(
    bool Allowed,
    int StatusCode,
    string? Message,
    DateTime? RetryAfterUtc)
{
    public static FullExportGateResult AllowedResult() => new(true, StatusCodes.Status200OK, null, null);

    public static FullExportGateResult Blocked(int statusCode, string message, DateTime? retryAfterUtc) =>
        new(false, statusCode, message, retryAfterUtc);
}
