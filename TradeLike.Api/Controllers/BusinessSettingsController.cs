using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Settings;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireManagerRole")]
[Route("api/business-settings")]
public class BusinessSettingsController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public BusinessSettingsController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<BusinessSettingsResponse>> Get()
    {
        var settings = await GetOrCreateSettingsAsync(TenantHelpers.GetTenantId(HttpContext));

        return Ok(ToResponse(settings));
    }

    [HttpPut]
    public async Task<ActionResult<BusinessSettingsResponse>> Update(
        [FromBody] UpdateBusinessSettingsRequest request)
    {
        if (!CustomerRoles.IsManagerOrDirector(User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value))
        {
            return Forbid();
        }

        try
        {
            var settings = await GetOrCreateSettingsAsync(TenantHelpers.GetTenantId(HttpContext));

            settings.BusinessName = Required(request.BusinessName, "Business name");
            settings.LegalName = Clean(request.LegalName);
            settings.LogoUrl = Clean(request.LogoUrl);
            settings.AddressLine1 = Clean(request.AddressLine1);
            settings.AddressLine2 = Clean(request.AddressLine2);
            settings.Town = Clean(request.Town);
            settings.County = Clean(request.County);
            settings.Postcode = Clean(request.Postcode);
            settings.Country = Clean(request.Country) ?? "United Kingdom";
            settings.Phone = Clean(request.Phone);
            settings.Email = Clean(request.Email);
            settings.Website = Clean(request.Website);
            settings.VatNumber = Clean(request.VatNumber);
            settings.CompanyNumber = Clean(request.CompanyNumber);
            settings.DefaultVatRate = ClampVat(request.DefaultVatRate);
            settings.QuotePrefix = Required(request.QuotePrefix, "Quote prefix").ToUpperInvariant();
            settings.InvoicePrefix = Required(request.InvoicePrefix, "Invoice prefix").ToUpperInvariant();
            settings.PaymentTerms = Clean(request.PaymentTerms);
            settings.QuoteExpiryDays = ClampDays(request.QuoteExpiryDays, "Quote expiry days");
            settings.DefaultQuoteNotes = Clean(request.DefaultQuoteNotes);
            settings.DefaultInvoiceNotes = Clean(request.DefaultInvoiceNotes);
            settings.ReplyToEmail = Clean(request.ReplyToEmail);
            settings.DefaultJobPriority = NormalizePriority(request.DefaultJobPriority);
            settings.DefaultScheduleView = NormalizeScheduleView(request.DefaultScheduleView);
            settings.DefaultReportRange = NormalizeReportRange(request.DefaultReportRange);
            settings.IncludeCompletedInReports = request.IncludeCompletedInReports;
            settings.IncludeArchivedInReports = request.IncludeArchivedInReports;
            settings.LowStockThreshold = ClampLowStockThreshold(request.LowStockThreshold);
            settings.PurchaseOrderPrefix = Required(request.PurchaseOrderPrefix, "Purchase order prefix").ToUpperInvariant();
            settings.BankName = Clean(request.BankName);
            settings.BankAccountName = Clean(request.BankAccountName);
            settings.BankSortCode = Clean(request.BankSortCode);
            settings.BankAccountNumber = Clean(request.BankAccountNumber);
            settings.EmailFooter = Clean(request.EmailFooter);
            settings.UpdatedAt = DateTime.UtcNow;

            Validate(settings);

            await _context.SaveChangesAsync();

            return Ok(ToResponse(settings));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private async Task<BusinessSettings> GetOrCreateSettingsAsync(int tenantId)
    {
        var settings = await _context.BusinessSettings.FirstOrDefaultAsync(existing => existing.TenantId == tenantId);

        if (settings is not null)
        {
            return settings;
        }

        settings = new BusinessSettings
        {
            TenantId = tenantId,
            BusinessName = "TradeLike",
            Country = "United Kingdom",
            DefaultVatRate = 20m,
            QuotePrefix = "Q",
            InvoicePrefix = "INV",
            PaymentTerms = "Payment due within 14 days.",
            QuoteExpiryDays = 30,
            DefaultJobPriority = "Normal",
            DefaultScheduleView = "Week",
            DefaultReportRange = "30d",
            IncludeCompletedInReports = true,
            IncludeArchivedInReports = false,
            LowStockThreshold = 5,
            PurchaseOrderPrefix = "PO",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.BusinessSettings.AddAsync(settings);
        await _context.SaveChangesAsync();

        return settings;
    }

    private static BusinessSettingsResponse ToResponse(BusinessSettings settings)
    {
        return new BusinessSettingsResponse(
            settings.Id,
            settings.TenantId,
            settings.BusinessName,
            settings.LegalName,
            settings.LogoUrl,
            settings.AddressLine1,
            settings.AddressLine2,
            settings.Town,
            settings.County,
            settings.Postcode,
            settings.Country,
            settings.Phone,
            settings.Email,
            settings.Website,
            settings.VatNumber,
            settings.CompanyNumber,
            settings.DefaultVatRate,
            settings.QuotePrefix,
            settings.InvoicePrefix,
            settings.PaymentTerms,
            settings.QuoteExpiryDays,
            settings.DefaultQuoteNotes,
            settings.DefaultInvoiceNotes,
            settings.ReplyToEmail,
            settings.DefaultJobPriority,
            settings.DefaultScheduleView,
            settings.DefaultReportRange,
            settings.IncludeCompletedInReports,
            settings.IncludeArchivedInReports,
            settings.LowStockThreshold,
            settings.PurchaseOrderPrefix,
            settings.BankName,
            settings.BankAccountName,
            settings.BankSortCode,
            settings.BankAccountNumber,
            settings.EmailFooter,
            settings.CreatedAt,
            settings.UpdatedAt);
    }

    private static string? Clean(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string Required(string value, string label)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ValidationException($"{label} is required.");
        }

        return value.Trim();
    }

    private static decimal ClampVat(decimal value)
    {
        if (value < 0 || value > 100)
        {
            throw new ValidationException("Default VAT rate must be between 0 and 100.");
        }

        return Math.Round(value, 2);
    }

    private static int ClampDays(int value, string label)
    {
        if (value < 1 || value > 365)
        {
            throw new ValidationException($"{label} must be between 1 and 365.");
        }

        return value;
    }

    private static int ClampLowStockThreshold(int value)
    {
        if (value < 0 || value > 100000)
        {
            throw new ValidationException("Low stock threshold must be between 0 and 100000.");
        }

        return value;
    }

    private static string NormalizePriority(string value)
    {
        var cleaned = Required(value, "Default job priority");
        return cleaned.Equals("high", StringComparison.OrdinalIgnoreCase)
            ? "High"
            : cleaned.Equals("low", StringComparison.OrdinalIgnoreCase)
                ? "Low"
                : "Normal";
    }

    private static string NormalizeScheduleView(string value)
    {
        var cleaned = Required(value, "Default schedule view");
        return cleaned.Equals("day", StringComparison.OrdinalIgnoreCase)
            ? "Day"
            : "Week";
    }

    private static string NormalizeReportRange(string value)
    {
        var cleaned = Required(value, "Default report range").Trim().ToLowerInvariant();
        return cleaned switch
        {
            "7d" => "7d",
            "30d" => "30d",
            "90d" => "90d",
            "12m" => "12m",
            _ => throw new ValidationException("Default report range must be one of 7d, 30d, 90d or 12m.")
        };
    }

    private static void Validate(BusinessSettings settings)
    {
        ValidateMax(settings.BusinessName, 180, "Business name");
        ValidateMax(settings.LegalName, 180, "Legal name");
        ValidateMax(settings.LogoUrl, 500, "Logo URL");
        ValidateMax(settings.Email, 255, "Email");
        ValidateMax(settings.Website, 255, "Website");
        ValidateMax(settings.CompanyNumber, 60, "Company number");
        ValidateMax(settings.QuotePrefix, 20, "Quote prefix");
        ValidateMax(settings.InvoicePrefix, 20, "Invoice prefix");
        ValidateMax(settings.PaymentTerms, 1000, "Payment terms");
        ValidateMax(settings.DefaultQuoteNotes, 2000, "Default quote notes");
        ValidateMax(settings.DefaultInvoiceNotes, 2000, "Default invoice notes");
        ValidateMax(settings.ReplyToEmail, 255, "Reply-to email");
        ValidateMax(settings.DefaultJobPriority, 30, "Default job priority");
        ValidateMax(settings.DefaultScheduleView, 30, "Default schedule view");
        ValidateMax(settings.DefaultReportRange, 40, "Default report range");
        ValidateMax(settings.PurchaseOrderPrefix, 20, "Purchase order prefix");
        ValidateMax(settings.EmailFooter, 2000, "Email footer");
    }

    private static void ValidateMax(string? value, int maxLength, string label)
    {
        if (value is not null && value.Length > maxLength)
        {
            throw new ValidationException($"{label} cannot be longer than {maxLength} characters.");
        }
    }
}
