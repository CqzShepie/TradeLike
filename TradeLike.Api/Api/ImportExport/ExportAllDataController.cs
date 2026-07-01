using System.IO.Compression;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.PublicApi;
using TradeLike.Api.Security;

namespace TradeLike.Api.ImportExport;

[ApiController]
[Authorize(Policy = "RequireDirectorRole")]
[Route("api/export")]
public sealed class ExportAllDataController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly TradeLikeDbContext _context;

    public ExportAllDataController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet("all-data.zip")]
    public async Task<IActionResult> ExportAllData(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);

        var customers = await _context.Customers
            .AsNoTracking()
            .Where(customer => customer.TenantId == tenantId)
            .OrderBy(customer => customer.Name)
            .ToListAsync(cancellationToken);

        var jobs = await _context.Jobs
            .AsNoTracking()
            .Where(job => job.TenantId == tenantId)
            .OrderByDescending(job => job.ScheduledDate)
            .ToListAsync(cancellationToken);

        var quotes = await _context.Quotes
            .AsNoTracking()
            .Include(quote => quote.LineItems)
            .Where(quote => quote.TenantId == tenantId)
            .OrderByDescending(quote => quote.CreatedAt)
            .ToListAsync(cancellationToken);

        var invoices = await QueryImportedInvoicesAsync(tenantId, cancellationToken);
        var importJobs = await QueryImportJobsAsync(tenantId, cancellationToken);
        var apiClients = await QueryApiClientsAsync(tenantId, cancellationToken);
        var webhooks = await QueryWebhooksAsync(tenantId, cancellationToken);
        var branding = await QueryBrandingAsync(tenantId, cancellationToken);

        await using var stream = new MemoryStream();
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
        {
            await AddJsonEntryAsync(archive, "customers.json", customers, cancellationToken);
            await AddJsonEntryAsync(archive, "jobs.json", jobs, cancellationToken);
            await AddJsonEntryAsync(archive, "quotes.json", quotes, cancellationToken);
            await AddJsonEntryAsync(archive, "invoices.json", invoices, cancellationToken);
            await AddJsonEntryAsync(archive, "import-jobs.json", importJobs, cancellationToken);
            await AddJsonEntryAsync(archive, "api-clients.json", apiClients, cancellationToken);
            await AddJsonEntryAsync(archive, "webhooks.json", webhooks, cancellationToken);
            await AddJsonEntryAsync(archive, "branding.json", branding, cancellationToken);
        }

        return File(
            stream.ToArray(),
            "application/zip",
            $"tradelike-all-data-{DateTime.UtcNow:yyyyMMddHHmmss}.zip");
    }

    private async Task<List<object>> QueryImportedInvoicesAsync(int tenantId, CancellationToken cancellationToken)
    {
        return await RawSql.QueryAsync(
            _context,
            """
            SELECT [Id], [InvoiceNumber], [CustomerName], [CustomerEmail], [IssueDate], [DueDate], [Total], [Status], [Notes], [CreatedAtUtc]
            FROM [ImportedInvoices]
            WHERE [TenantId] = @TenantId
            ORDER BY [IssueDate] DESC, [Id] DESC
            """,
            reader => new
            {
                Id = RawSql.ReadInt(reader, "Id"),
                InvoiceNumber = RawSql.ReadString(reader, "InvoiceNumber"),
                CustomerName = RawSql.ReadString(reader, "CustomerName"),
                CustomerEmail = RawSql.ReadString(reader, "CustomerEmail"),
                IssueDate = RawSql.ReadDateTime(reader, "IssueDate"),
                DueDate = RawSql.ReadDateTime(reader, "DueDate"),
                Total = Convert.ToDecimal(reader["Total"]),
                Status = RawSql.ReadString(reader, "Status"),
                Notes = RawSql.ReadString(reader, "Notes"),
                CreatedAtUtc = RawSql.ReadDateTime(reader, "CreatedAtUtc")
            },
            cancellationToken,
            new SqlParam("@TenantId", tenantId))
            .ContinueWith(task => task.Result.Cast<object>().ToList(), cancellationToken);
    }

    private async Task<List<object>> QueryImportJobsAsync(int tenantId, CancellationToken cancellationToken)
    {
        return await RawSql.QueryAsync(
            _context,
            """
            SELECT [Id], [Entity], [FileName], [Status], [TotalRows], [SucceededRows], [FailedRows], [ErrorSummary], [CreatedAtUtc], [StartedAtUtc], [CompletedAtUtc]
            FROM [ImportJobs]
            WHERE [TenantId] = @TenantId
            ORDER BY [CreatedAtUtc] DESC
            """,
            reader => new
            {
                Id = RawSql.ReadInt(reader, "Id"),
                Entity = RawSql.ReadString(reader, "Entity"),
                FileName = RawSql.ReadString(reader, "FileName"),
                Status = RawSql.ReadString(reader, "Status"),
                TotalRows = RawSql.ReadInt(reader, "TotalRows"),
                SucceededRows = RawSql.ReadInt(reader, "SucceededRows"),
                FailedRows = RawSql.ReadInt(reader, "FailedRows"),
                ErrorSummary = RawSql.ReadString(reader, "ErrorSummary"),
                CreatedAtUtc = RawSql.ReadDateTime(reader, "CreatedAtUtc"),
                StartedAtUtc = RawSql.ReadDateTime(reader, "StartedAtUtc"),
                CompletedAtUtc = RawSql.ReadDateTime(reader, "CompletedAtUtc")
            },
            cancellationToken,
            new SqlParam("@TenantId", tenantId))
            .ContinueWith(task => task.Result.Cast<object>().ToList(), cancellationToken);
    }

    private async Task<List<object>> QueryApiClientsAsync(int tenantId, CancellationToken cancellationToken)
    {
        return await RawSql.QueryAsync(
            _context,
            """
            SELECT [Id], [ClientId], [Name], [Scopes], [IsActive], [CreatedAtUtc], [LastUsedAtUtc]
            FROM [ApiClients]
            WHERE [TenantId] = @TenantId
            ORDER BY [CreatedAtUtc] DESC
            """,
            reader => new
            {
                Id = RawSql.ReadInt(reader, "Id"),
                ClientId = RawSql.ReadString(reader, "ClientId"),
                Name = RawSql.ReadString(reader, "Name"),
                Scopes = RawSql.ReadString(reader, "Scopes"),
                IsActive = RawSql.ReadBool(reader, "IsActive"),
                CreatedAtUtc = RawSql.ReadDateTime(reader, "CreatedAtUtc"),
                LastUsedAtUtc = RawSql.ReadDateTime(reader, "LastUsedAtUtc")
            },
            cancellationToken,
            new SqlParam("@TenantId", tenantId))
            .ContinueWith(task => task.Result.Cast<object>().ToList(), cancellationToken);
    }

    private async Task<List<object>> QueryWebhooksAsync(int tenantId, CancellationToken cancellationToken)
    {
        return await RawSql.QueryAsync(
            _context,
            """
            SELECT [Id], [TargetUrl], [EventsJson], [IsActive], [CreatedAtUtc], [LastDeliveryAtUtc]
            FROM [WebhookSubscriptions]
            WHERE [TenantId] = @TenantId
            ORDER BY [CreatedAtUtc] DESC
            """,
            reader => new
            {
                Id = RawSql.ReadInt(reader, "Id"),
                TargetUrl = RawSql.ReadString(reader, "TargetUrl"),
                EventsJson = RawSql.ReadString(reader, "EventsJson"),
                IsActive = RawSql.ReadBool(reader, "IsActive"),
                CreatedAtUtc = RawSql.ReadDateTime(reader, "CreatedAtUtc"),
                LastDeliveryAtUtc = RawSql.ReadDateTime(reader, "LastDeliveryAtUtc")
            },
            cancellationToken,
            new SqlParam("@TenantId", tenantId))
            .ContinueWith(task => task.Result.Cast<object>().ToList(), cancellationToken);
    }

    private async Task<List<object>> QueryBrandingAsync(int tenantId, CancellationToken cancellationToken)
    {
        return await RawSql.QueryAsync(
            _context,
            """
            SELECT [BrandName], [LogoUrl], [PrimaryColor], [AccentColor], [SupportEmail], [CustomDomain], [HideTradeLikeBranding], [UpdatedAtUtc]
            FROM [TenantBranding]
            WHERE [TenantId] = @TenantId
            """,
            reader => new
            {
                BrandName = RawSql.ReadString(reader, "BrandName"),
                LogoUrl = RawSql.ReadString(reader, "LogoUrl"),
                PrimaryColor = RawSql.ReadString(reader, "PrimaryColor"),
                AccentColor = RawSql.ReadString(reader, "AccentColor"),
                SupportEmail = RawSql.ReadString(reader, "SupportEmail"),
                CustomDomain = RawSql.ReadString(reader, "CustomDomain"),
                HideTradeLikeBranding = RawSql.ReadBool(reader, "HideTradeLikeBranding"),
                UpdatedAtUtc = RawSql.ReadDateTime(reader, "UpdatedAtUtc")
            },
            cancellationToken,
            new SqlParam("@TenantId", tenantId))
            .ContinueWith(task => task.Result.Cast<object>().ToList(), cancellationToken);
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
