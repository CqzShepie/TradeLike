using System.IO.Compression;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Security;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireDirectorRole")]
[Route("api/account/export-data")]
public sealed class ExportDataController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly TradeLikeDbContext _context;

    public ExportDataController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> ExportData()
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var cancellationToken = HttpContext.RequestAborted;

        var customers = await _context.Customers
            .AsNoTracking()
            .Where(customer => customer.TenantId == tenantId)
            .OrderBy(customer => customer.Name)
            .Select(customer => new
            {
                customer.Id,
                customer.Name,
                customer.Email,
                customer.Phone,
                customer.Address,
                customer.Notes
            })
            .ToListAsync(cancellationToken);

        var jobs = await _context.Jobs
            .AsNoTracking()
            .Where(job => job.TenantId == tenantId)
            .OrderBy(job => job.ScheduledDate)
            .Select(job => new
            {
                job.Id,
                job.Customer,
                job.Phone,
                job.JobTitle,
                job.Address,
                job.ScheduledDate,
                job.Status,
                job.Priority,
                job.Notes,
                job.QuoteId,
                job.EngineerId
            })
            .ToListAsync(cancellationToken);

        var quotes = await _context.Quotes
            .AsNoTracking()
            .Include(quote => quote.LineItems)
            .Where(quote => quote.TenantId == tenantId)
            .OrderByDescending(quote => quote.CreatedAt)
            .Select(quote => new
            {
                quote.Id,
                quote.CustomerId,
                quote.CustomerName,
                quote.Title,
                quote.Description,
                quote.Amount,
                quote.Subtotal,
                quote.VatTotal,
                quote.DiscountType,
                quote.DiscountValue,
                quote.DiscountTotal,
                quote.Total,
                quote.Status,
                quote.Notes,
                quote.CreatedAt,
                LineItems = quote.LineItems
                    .OrderBy(item => item.Id)
                    .Select(item => new
                    {
                        item.Id,
                        item.Type,
                        item.Description,
                        item.Quantity,
                        item.UnitPrice,
                        item.VatRate,
                        item.LineTotal
                    })
            })
            .ToListAsync(cancellationToken);

        await using var stream = new MemoryStream();
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
        {
            await AddJsonEntryAsync(archive, "customers.json", customers, cancellationToken);
            await AddJsonEntryAsync(archive, "jobs.json", jobs, cancellationToken);
            await AddJsonEntryAsync(archive, "quotes.json", quotes, cancellationToken);
            await AddJsonEntryAsync(archive, "invoices.json", Array.Empty<object>(), cancellationToken);
        }

        return File(
            stream.ToArray(),
            "application/zip",
            $"tradelike-export-{DateTime.UtcNow:yyyyMMddHHmmss}.zip");
    }

    private static async Task AddJsonEntryAsync<T>(
        ZipArchive archive,
        string fileName,
        T data,
        CancellationToken cancellationToken)
    {
        var entry = archive.CreateEntry(fileName, CompressionLevel.Fastest);
        await using var entryStream = entry.Open();
        await JsonSerializer.SerializeAsync(entryStream, data, JsonOptions, cancellationToken);
    }
}
