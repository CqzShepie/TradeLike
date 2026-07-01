using System.ComponentModel.DataAnnotations;
using System.Globalization;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.PublicApi;

namespace TradeLike.Api.ImportExport;

internal sealed class ImportJobProcessor
{
    private static readonly EmailAddressAttribute EmailValidator = new();

    private readonly TradeLikeDbContext _context;
    private readonly ILogger<ImportJobProcessor> _logger;

    public ImportJobProcessor(TradeLikeDbContext context, ILogger<ImportJobProcessor> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task ProcessAsync(
        int jobId,
        int tenantId,
        string entity,
        IReadOnlyList<ParsedImportRow> rows,
        CancellationToken cancellationToken)
    {
        var succeeded = 0;
        var failed = 0;

        await UpdateJobAsync(jobId, "Processing", rows.Count, 0, 0, null, started: true, completed: false, cancellationToken);

        try
        {
            foreach (var row in rows)
            {
                try
                {
                    await ProcessRowAsync(tenantId, entity, row, cancellationToken);
                    succeeded++;
                }
                catch (Exception ex) when (ex is ValidationException or FormatException or InvalidOperationException)
                {
                    failed++;
                    await QueueRowErrorAsync(jobId, row, string.Empty, ex.Message, cancellationToken);
                }
            }

            var finalStatus = failed == 0 ? "Completed" : succeeded == 0 ? "Failed" : "CompletedWithErrors";
            var summary = failed == 0 ? null : $"{failed} row(s) failed validation.";
            await UpdateJobAsync(jobId, finalStatus, rows.Count, succeeded, failed, summary, started: false, completed: true, cancellationToken);

            await WebhookEventPublisher.QueueAsync(
                _context,
                tenantId,
                "import.completed",
                new { jobId, entity, totalRows = rows.Count, succeededRows = succeeded, failedRows = failed, status = finalStatus },
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Import job {JobId} failed.", jobId);
            await UpdateJobAsync(jobId, "Failed", rows.Count, succeeded, rows.Count - succeeded, ex.Message, started: false, completed: true, cancellationToken);
        }
    }

    private async Task ProcessRowAsync(
        int tenantId,
        string entity,
        ParsedImportRow row,
        CancellationToken cancellationToken)
    {
        switch (entity)
        {
            case "customers":
                await ImportCustomerAsync(tenantId, row, cancellationToken);
                break;
            case "jobs":
                await ImportJobAsync(tenantId, row, cancellationToken);
                break;
            case "invoices":
                await ImportInvoiceAsync(tenantId, row, cancellationToken);
                break;
            default:
                throw new InvalidOperationException("Unsupported import entity.");
        }
    }

    private async Task ImportCustomerAsync(int tenantId, ParsedImportRow row, CancellationToken cancellationToken)
    {
        var name = Required(row, "name", "customer", "customername");
        var email = Required(row, "email", "customeremail");
        var phone = Required(row, "phone", "telephone", "mobile");
        var address = Required(row, "address", "siteaddress");

        if (!EmailValidator.IsValid(email))
        {
            throw new ValidationException("Email address is invalid.");
        }

        var customer = new Customer
        {
            TenantId = tenantId,
            Name = name,
            Email = email,
            Phone = phone,
            Address = address,
            Notes = ImportParsing.Get(row, "notes")
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync(cancellationToken);

        await WebhookEventPublisher.QueueAsync(
            _context,
            tenantId,
            "customer.created",
            new { customer.Id, customer.Name, customer.Email },
            cancellationToken);
    }

    private async Task ImportJobAsync(int tenantId, ParsedImportRow row, CancellationToken cancellationToken)
    {
        var scheduledDate = RequiredDate(row, "scheduleddate", "date", "jobdate");
        var job = new Job
        {
            TenantId = tenantId,
            Customer = Required(row, "customer", "customername", "name"),
            Phone = Required(row, "phone", "telephone", "mobile"),
            JobTitle = Required(row, "jobtitle", "title", "work"),
            Address = Required(row, "address", "siteaddress"),
            ScheduledDate = scheduledDate,
            Status = ImportParsing.Get(row, "status") ?? "Scheduled",
            Priority = ImportParsing.Get(row, "priority") ?? "Normal",
            Notes = ImportParsing.Get(row, "notes")
        };

        job.Validate();

        _context.Jobs.Add(job);
        await _context.SaveChangesAsync(cancellationToken);

        await WebhookEventPublisher.QueueAsync(
            _context,
            tenantId,
            "job.created",
            new { job.Id, job.Customer, job.JobTitle, job.ScheduledDate },
            cancellationToken);
    }

    private async Task ImportInvoiceAsync(int tenantId, ParsedImportRow row, CancellationToken cancellationToken)
    {
        var invoiceNumber = Required(row, "invoicenumber", "invoice", "number");
        var customerName = Required(row, "customername", "customer", "name");
        var total = RequiredDecimal(row, "total", "amount", "invoiceamount");
        var issueDate = OptionalDate(row, "issuedate", "date") ?? DateTime.UtcNow.Date;
        var dueDate = OptionalDate(row, "duedate");
        var customerEmail = ImportParsing.Get(row, "customeremail", "email") ?? string.Empty;

        await RawSql.ExecuteAsync(
            _context,
            """
            INSERT INTO [ImportedInvoices]
                ([TenantId], [InvoiceNumber], [CustomerName], [CustomerEmail], [IssueDate], [DueDate], [Total], [Status], [Notes], [CreatedAtUtc])
            VALUES
                (@TenantId, @InvoiceNumber, @CustomerName, @CustomerEmail, @IssueDate, @DueDate, @Total, @Status, @Notes, SYSUTCDATETIME())
            """,
            cancellationToken,
            new SqlParam("@TenantId", tenantId),
            new SqlParam("@InvoiceNumber", invoiceNumber),
            new SqlParam("@CustomerName", customerName),
            new SqlParam("@CustomerEmail", customerEmail),
            new SqlParam("@IssueDate", issueDate),
            new SqlParam("@DueDate", dueDate),
            new SqlParam("@Total", total),
            new SqlParam("@Status", ImportParsing.Get(row, "status") ?? "Imported"),
            new SqlParam("@Notes", ImportParsing.Get(row, "notes")));

        await WebhookEventPublisher.QueueAsync(
            _context,
            tenantId,
            "invoice.created",
            new { invoiceNumber, customerName, total, issueDate },
            cancellationToken);
    }

    private static string Required(ParsedImportRow row, params string[] keys)
    {
        return ImportParsing.Get(row, keys) is { } value
            ? value
            : throw new ValidationException($"{keys[0]} is required.");
    }

    private static DateTime RequiredDate(ParsedImportRow row, params string[] keys)
    {
        return OptionalDate(row, keys) ??
            throw new ValidationException($"{keys[0]} is required.");
    }

    private static DateTime? OptionalDate(ParsedImportRow row, params string[] keys)
    {
        var value = ImportParsing.Get(row, keys);
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var parsed)
            ? parsed
            : throw new FormatException($"{keys[0]} must be a valid date.");
    }

    private static decimal RequiredDecimal(ParsedImportRow row, params string[] keys)
    {
        var value = Required(row, keys);
        return decimal.TryParse(value, NumberStyles.Number | NumberStyles.AllowCurrencySymbol, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : throw new FormatException($"{keys[0]} must be a valid number.");
    }

    private async Task QueueRowErrorAsync(
        int jobId,
        ParsedImportRow row,
        string fieldName,
        string message,
        CancellationToken cancellationToken)
    {
        await RawSql.ExecuteAsync(
            _context,
            """
            INSERT INTO [ImportJobErrors]
                ([ImportJobId], [RowNumber], [FieldName], [Message], [RawRow], [CreatedAtUtc])
            VALUES
                (@ImportJobId, @RowNumber, @FieldName, @Message, @RawRow, SYSUTCDATETIME())
            """,
            cancellationToken,
            new SqlParam("@ImportJobId", jobId),
            new SqlParam("@RowNumber", row.RowNumber),
            new SqlParam("@FieldName", fieldName),
            new SqlParam("@Message", message),
            new SqlParam("@RawRow", row.RawRow));
    }

    private async Task UpdateJobAsync(
        int jobId,
        string status,
        int totalRows,
        int succeededRows,
        int failedRows,
        string? errorSummary,
        bool started,
        bool completed,
        CancellationToken cancellationToken)
    {
        await RawSql.ExecuteAsync(
            _context,
            $"""
            UPDATE [ImportJobs]
            SET [Status] = @Status,
                [TotalRows] = @TotalRows,
                [SucceededRows] = @SucceededRows,
                [FailedRows] = @FailedRows,
                [ErrorSummary] = @ErrorSummary
                {(started ? ", [StartedAtUtc] = SYSUTCDATETIME()" : string.Empty)}
                {(completed ? ", [CompletedAtUtc] = SYSUTCDATETIME()" : string.Empty)}
            WHERE [Id] = @Id
            """,
            cancellationToken,
            new SqlParam("@Id", jobId),
            new SqlParam("@Status", status),
            new SqlParam("@TotalRows", totalRows),
            new SqlParam("@SucceededRows", succeededRows),
            new SqlParam("@FailedRows", failedRows),
            new SqlParam("@ErrorSummary", errorSummary));
    }
}
