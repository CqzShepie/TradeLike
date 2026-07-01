using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using TradeLike.Api.Data;
using TradeLike.Api.PublicApi;
using TradeLike.Api.Security;

namespace TradeLike.Api.ImportExport;

[ApiController]
[Authorize(Policy = "RequireManagerRole")]
[Route("api/import")]
public sealed class ImportController : ControllerBase
{
    private static readonly HashSet<string> SupportedEntities = new(StringComparer.OrdinalIgnoreCase)
    {
        "customers",
        "jobs",
        "invoices"
    };

    private readonly TradeLikeDbContext _context;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ImportController> _logger;

    public ImportController(
        TradeLikeDbContext context,
        IServiceScopeFactory scopeFactory,
        ILogger<ImportController> logger)
    {
        _context = context;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    [HttpPost("{entity}")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> Import(string entity, CancellationToken cancellationToken)
    {
        entity = entity.Trim().ToLowerInvariant();
        if (!SupportedEntities.Contains(entity))
        {
            return BadRequest(new { error = "Entity must be customers, jobs, or invoices." });
        }

        var upload = await ReadUploadAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(upload.Content))
        {
            return BadRequest(new { error = "Import file or request body is required." });
        }

        IReadOnlyList<ParsedImportRow> rows;
        try
        {
            rows = ImportParsing.Parse(upload.Content);
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException)
        {
            return BadRequest(new { error = ex.Message });
        }

        if (rows.Count == 0)
        {
            return BadRequest(new { error = "Import contains no data rows." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var jobId = await RawSql.ScalarAsync(
            _context,
            """
            INSERT INTO [ImportJobs]
                ([TenantId], [Entity], [FileName], [Status], [TotalRows], [SucceededRows], [FailedRows], [CreatedAtUtc])
            OUTPUT INSERTED.[Id]
            VALUES
                (@TenantId, @Entity, @FileName, N'Queued', @TotalRows, 0, 0, SYSUTCDATETIME())
            """,
            cancellationToken,
            new SqlParam("@TenantId", tenantId),
            new SqlParam("@Entity", entity),
            new SqlParam("@FileName", upload.FileName),
            new SqlParam("@TotalRows", rows.Count));

        var importJobId = Convert.ToInt32(jobId);
        StartBackgroundImport(importJobId, tenantId, entity, rows);

        return Accepted(new ImportJobCreatedResponse(importJobId, entity, "Queued", rows.Count));
    }

    [HttpGet("jobs/{jobId:int}")]
    public async Task<ActionResult<ImportJobStatusResponse>> Status(int jobId, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var jobs = await RawSql.QueryAsync(
            _context,
            """
            SELECT TOP 1 [Id], [Entity], [FileName], [Status], [TotalRows], [SucceededRows], [FailedRows], [ErrorSummary], [CreatedAtUtc], [StartedAtUtc], [CompletedAtUtc]
            FROM [ImportJobs]
            WHERE [Id] = @Id AND [TenantId] = @TenantId
            """,
            reader => new ImportJobStatusResponse(
                RawSql.ReadInt(reader, "Id"),
                RawSql.ReadString(reader, "Entity"),
                RawSql.ReadString(reader, "FileName"),
                RawSql.ReadString(reader, "Status"),
                RawSql.ReadInt(reader, "TotalRows"),
                RawSql.ReadInt(reader, "SucceededRows"),
                RawSql.ReadInt(reader, "FailedRows"),
                RawSql.ReadString(reader, "ErrorSummary"),
                RawSql.ReadDateTime(reader, "CreatedAtUtc") ?? DateTime.UtcNow,
                RawSql.ReadDateTime(reader, "StartedAtUtc"),
                RawSql.ReadDateTime(reader, "CompletedAtUtc"),
                []),
            cancellationToken,
            new SqlParam("@Id", jobId),
            new SqlParam("@TenantId", tenantId));

        var job = jobs.FirstOrDefault();
        if (job is null)
        {
            return NotFound();
        }

        var errors = await RawSql.QueryAsync(
            _context,
            """
            SELECT TOP 200 [RowNumber], [FieldName], [Message], [RawRow], [CreatedAtUtc]
            FROM [ImportJobErrors]
            WHERE [ImportJobId] = @ImportJobId
            ORDER BY [RowNumber], [Id]
            """,
            reader => new ImportJobErrorResponse(
                RawSql.ReadInt(reader, "RowNumber"),
                RawSql.ReadString(reader, "FieldName"),
                RawSql.ReadString(reader, "Message"),
                RawSql.ReadString(reader, "RawRow"),
                RawSql.ReadDateTime(reader, "CreatedAtUtc") ?? DateTime.UtcNow),
            cancellationToken,
            new SqlParam("@ImportJobId", jobId));

        return Ok(job with { Errors = errors });
    }

    private void StartBackgroundImport(
        int jobId,
        int tenantId,
        string entity,
        IReadOnlyList<ParsedImportRow> rows)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<TradeLikeDbContext>();
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<ImportJobProcessor>>();
                var processor = new ImportJobProcessor(context, logger);
                await processor.ProcessAsync(jobId, tenantId, entity, rows, CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unable to start import job {JobId}.", jobId);
            }
        });
    }

    private async Task<UploadPayload> ReadUploadAsync(CancellationToken cancellationToken)
    {
        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync(cancellationToken);
            var file = form.Files.GetFile("file") ?? form.Files.FirstOrDefault();

            if (file is not null)
            {
                await using var stream = file.OpenReadStream();
                using var reader = new StreamReader(stream, Encoding.UTF8);
                return new UploadPayload(file.FileName, await reader.ReadToEndAsync(cancellationToken));
            }
        }

        using var bodyReader = new StreamReader(Request.Body, Encoding.UTF8);
        return new UploadPayload("request-body", await bodyReader.ReadToEndAsync(cancellationToken));
    }
}

public sealed record ImportJobCreatedResponse(
    int JobId,
    string Entity,
    string Status,
    int TotalRows);

public sealed record ImportJobStatusResponse(
    int JobId,
    string Entity,
    string FileName,
    string Status,
    int TotalRows,
    int SucceededRows,
    int FailedRows,
    string ErrorSummary,
    DateTime CreatedAtUtc,
    DateTime? StartedAtUtc,
    DateTime? CompletedAtUtc,
    IReadOnlyList<ImportJobErrorResponse> Errors);

public sealed record ImportJobErrorResponse(
    int RowNumber,
    string FieldName,
    string Message,
    string RawRow,
    DateTime CreatedAtUtc);

internal sealed record UploadPayload(string FileName, string Content);
