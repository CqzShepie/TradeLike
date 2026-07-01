using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TradeLike.Api.Configuration;
using TradeLike.Api.Data;
using TradeLike.Api.Inventory;
using TradeLike.Api.Security;

namespace TradeLike.Api.Companies;

[ApiController]
[Route("api/companies")]
[Authorize(Policy = "RequireEmployeeRole")]
public class CompaniesController : ControllerBase
{
    private readonly TradeLikeDbContext _db;

    public CompaniesController(TradeLikeDbContext db)
    {
        _db = db;
    }

    [HttpGet("branches")]
    public async Task<ActionResult<IReadOnlyList<CompanyBranchResponse>>> GetBranches(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var branches = await InventorySql.QueryAsync(
            _db,
            """
            SELECT Id, Name, IsDefault, IsActive, CreatedAt
            FROM CompanyBranches
            WHERE TenantId = @tenantId
            ORDER BY IsDefault DESC, Name
            """,
            static reader => new CompanyBranchResponse(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetBoolean(2),
                reader.GetBoolean(3),
                reader.GetDateTime(4)),
            cancellationToken,
            ("@tenantId", tenantId));

        return Ok(branches);
    }

    [HttpPost("branches")]
    public async Task<ActionResult<CompanyBranchResponse>> CreateBranch(CreateCompanyBranchRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { error = "Branch name is required." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var branch = await InventorySql.QuerySingleAsync(
            _db,
            """
            INSERT INTO CompanyBranches (TenantId, Name, IsDefault, IsActive, CreatedAt)
            OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.IsDefault, INSERTED.IsActive, INSERTED.CreatedAt
            VALUES (@tenantId, @name, @isDefault, 1, SYSUTCDATETIME())
            """,
            static reader => new CompanyBranchResponse(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetBoolean(2),
                reader.GetBoolean(3),
                reader.GetDateTime(4)),
            cancellationToken,
            ("@tenantId", tenantId),
            ("@name", request.Name.Trim()),
            ("@isDefault", request.IsDefault));

        return CreatedAtAction(nameof(GetBranches), new { id = branch.Id }, branch);
    }

    [HttpPost("branches/switch")]
    public ActionResult<object> SwitchBranch(SwitchBranchRequest request)
    {
        return Ok(new { branchId = request.BranchId, header = "X-Company-Branch-Id" });
    }
}

[ApiController]
[Route("api/branding")]
public class BrandingController : ControllerBase
{
    private readonly TradeLikeDbContext _db;

    public BrandingController(TradeLikeDbContext db)
    {
        _db = db;
    }

    [HttpGet("{tenantId:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<BrandingResponse>> GetBranding(int tenantId, CancellationToken cancellationToken)
    {
        var rows = await InventorySql.QueryAsync(
            _db,
            """
            SELECT TOP (1) BusinessName, QuotePrefix, InvoicePrefix, DefaultVatRate
            FROM BusinessSettings
            WHERE TenantId = @tenantId
            """,
            static reader => new BrandingResponse(
                reader.GetString(0),
                "#2563eb",
                "#0f172a",
                reader.GetString(1),
                reader.GetString(2),
                reader.GetDecimal(3)),
            cancellationToken,
            ("@tenantId", tenantId));

        return Ok(rows.FirstOrDefault() ?? new BrandingResponse("TradeLike", "#2563eb", "#0f172a", "Q", "INV", 20m));
    }
}

[ApiController]
[Route("api/customer-portal")]
public class CustomerPortalController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly TradeLikeDbContext _db;

    public CustomerPortalController(IConfiguration configuration, TradeLikeDbContext db)
    {
        _configuration = configuration;
        _db = db;
    }

    [HttpPost("magic-link")]
    [AllowAnonymous]
    public async Task<ActionResult<MagicLinkResponse>> CreateMagicLink(MagicLinkRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { error = "Email is required." });
        }

        var customer = await InventorySql.QueryAsync(
            _db,
            """
            SELECT TOP (1) Id, TenantId, Name, Email
            FROM Customers
            WHERE Email = @email
            ORDER BY Id DESC
            """,
            static reader => new PortalCustomer(
                reader.GetInt32(0),
                reader.GetInt32(1),
                reader.GetString(2),
                reader.GetString(3)),
            cancellationToken,
            ("@email", request.Email.Trim()));

        if (customer.Count == 0)
        {
            return Accepted(new MagicLinkResponse("Check your email for a secure sign-in link.", null, null));
        }

        var token = CreatePortalJwt(customer[0]);
        var baseUrl = _configuration["Portal:BaseUrl"] ?? "http://localhost:5174";
        return Ok(new MagicLinkResponse("Magic link created.", token, $"{baseUrl.TrimEnd('/')}/quotes?token={Uri.EscapeDataString(token)}"));
    }

    [HttpGet("quotes")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<PortalQuoteResponse>>> GetQuotes(CancellationToken cancellationToken)
    {
        var customerId = GetCustomerId();
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var rows = await InventorySql.QueryAsync(
            _db,
            """
            SELECT Id, Title, Status, Total, CreatedAt
            FROM Quotes
            WHERE TenantId = @tenantId AND CustomerId = @customerId
            ORDER BY CreatedAt DESC
            """,
            static reader => new PortalQuoteResponse(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetDecimal(3),
                reader.GetDateTime(4)),
            cancellationToken,
            ("@tenantId", tenantId),
            ("@customerId", customerId));

        return Ok(rows);
    }

    [HttpGet("jobs")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<PortalJobResponse>>> GetJobs(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var customerName = User.FindFirstValue("customer_name") ?? string.Empty;
        var rows = await InventorySql.QueryAsync(
            _db,
            """
            SELECT Id, JobTitle, Status, ScheduledDate, Address
            FROM Jobs
            WHERE TenantId = @tenantId AND Customer = @customerName
            ORDER BY ScheduledDate DESC
            """,
            static reader => new PortalJobResponse(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetDateTime(3),
                reader.GetString(4)),
            cancellationToken,
            ("@tenantId", tenantId),
            ("@customerName", customerName));

        return Ok(rows);
    }

    [HttpGet("invoices")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<PortalInvoiceResponse>>> GetInvoices(CancellationToken cancellationToken)
    {
        var customerId = GetCustomerId();
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var rows = await InventorySql.QueryAsync(
            _db,
            """
            SELECT Id, CONCAT(N'INV-', Id), Title, Total, CreatedAt
            FROM Quotes
            WHERE TenantId = @tenantId AND CustomerId = @customerId AND Status IN (N'Accepted', N'Converted')
            ORDER BY CreatedAt DESC
            """,
            static reader => new PortalInvoiceResponse(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetDecimal(3),
                "Draft",
                reader.GetDateTime(4)),
            cancellationToken,
            ("@tenantId", tenantId),
            ("@customerId", customerId));

        return Ok(rows);
    }

    [HttpPost("request-work")]
    [AllowAnonymous]
    public async Task<ActionResult<object>> RequestWork(RequestWorkRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Description))
        {
            return BadRequest(new { error = "Name, email, and work description are required." });
        }

        await InventorySql.ExecuteNonQueryAsync(
            _db,
            """
            INSERT INTO CustomerPortalRequests (TenantId, Name, Email, Phone, Description, CreatedAt)
            VALUES (@tenantId, @name, @email, @phone, @description, SYSUTCDATETIME())
            """,
            cancellationToken,
            ("@tenantId", request.TenantId),
            ("@name", request.Name.Trim()),
            ("@email", request.Email.Trim()),
            ("@phone", string.IsNullOrWhiteSpace(request.Phone) ? DBNull.Value : request.Phone.Trim()),
            ("@description", request.Description.Trim()));

        return Accepted(new { message = "Request received." });
    }

    private string CreatePortalJwt(PortalCustomer customer)
    {
        var jwtKey = _configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey == JwtSettings.EnvironmentPlaceholder)
        {
            throw new InvalidOperationException("Jwt:Key must be configured for portal links.");
        }

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, $"portal:{customer.Id}"),
            new Claim(ClaimTypes.NameIdentifier, customer.Id.ToString()),
            new Claim(ClaimTypes.Name, customer.Name),
            new Claim(ClaimTypes.Email, customer.Email),
            new Claim("tid", customer.TenantId.ToString()),
            new Claim("customer_id", customer.Id.ToString()),
            new Claim("customer_name", customer.Name),
            new Claim("scope", "customer_portal")
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)), SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private int GetCustomerId()
    {
        return int.TryParse(User.FindFirstValue("customer_id"), out var customerId) ? customerId : 0;
    }
}

public class CompanyBranchFilterMiddleware
{
    private readonly RequestDelegate _next;

    public CompanyBranchFilterMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var branchId = CompanyBranchContext.GetBranchId(context);
        if (branchId is not null)
        {
            context.Items["CompanyBranchId"] = branchId.Value;
        }

        await _next(context);
    }
}

public record CompanyBranchResponse(int Id, string Name, bool IsDefault, bool IsActive, DateTime CreatedAt);
public record CreateCompanyBranchRequest(string Name, bool IsDefault);
public record SwitchBranchRequest(int? BranchId);
public record BrandingResponse(string BusinessName, string PrimaryColour, string AccentColour, string QuotePrefix, string InvoicePrefix, decimal DefaultVatRate);
public record MagicLinkRequest(string Email);
public record MagicLinkResponse(string Message, string? Token, string? Url);
public record PortalCustomer(int Id, int TenantId, string Name, string Email);
public record PortalQuoteResponse(int Id, string Title, string Status, decimal Total, DateTime CreatedAt);
public record PortalJobResponse(int Id, string Title, string Status, DateTime ScheduledDate, string Address);
public record PortalInvoiceResponse(int Id, string InvoiceNumber, string Title, decimal Total, string Status, DateTime CreatedAt);
public record RequestWorkRequest(int TenantId, string Name, string Email, string? Phone, string Description);
