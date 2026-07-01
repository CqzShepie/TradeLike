using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TradeLike.Api.Configuration;
using TradeLike.Api.Data;

namespace TradeLike.Api.PublicApi;

[ApiController]
[AllowAnonymous]
[Route("api/public/v1")]
public sealed class PublicApiGatewayController : ControllerBase
{
    private readonly TradeLikeDbContext _context;
    private readonly PublicApiGatewayAuthorizer _authorizer;

    public PublicApiGatewayController(
        TradeLikeDbContext context,
        IOptions<JwtSettings> jwtSettings)
    {
        _context = context;
        _authorizer = new PublicApiGatewayAuthorizer(jwtSettings);
    }

    [HttpGet("customers")]
    public async Task<IActionResult> Customers(CancellationToken cancellationToken)
    {
        var authorization = _authorizer.Authorize(HttpContext, "customers:read");
        if (!authorization.Succeeded)
        {
            return StatusCode(authorization.StatusCode, new { error = authorization.Error });
        }

        var customers = await _context.Customers
            .AsNoTracking()
            .Where(customer => customer.TenantId == authorization.TenantId)
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

        return Ok(new { data = customers });
    }

    [HttpGet("jobs")]
    public async Task<IActionResult> Jobs(CancellationToken cancellationToken)
    {
        var authorization = _authorizer.Authorize(HttpContext, "jobs:read");
        if (!authorization.Succeeded)
        {
            return StatusCode(authorization.StatusCode, new { error = authorization.Error });
        }

        var jobs = await _context.Jobs
            .AsNoTracking()
            .Where(job => job.TenantId == authorization.TenantId)
            .OrderByDescending(job => job.ScheduledDate)
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

        return Ok(new { data = jobs });
    }

    [HttpGet("invoices")]
    public async Task<IActionResult> Invoices(CancellationToken cancellationToken)
    {
        var authorization = _authorizer.Authorize(HttpContext, "invoices:read");
        if (!authorization.Succeeded)
        {
            return StatusCode(authorization.StatusCode, new { error = authorization.Error });
        }

        var invoices = await RawSql.QueryAsync(
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
            new SqlParam("@TenantId", authorization.TenantId));

        return Ok(new { data = invoices });
    }
}
