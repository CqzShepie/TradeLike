using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Settings;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireDirectorRole")]
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
        var settings = await GetOrCreateSettingsAsync();

        return Ok(ToResponse(settings));
    }

    [HttpPut]
    public async Task<ActionResult<BusinessSettingsResponse>> Update(
        [FromBody] UpdateBusinessSettingsRequest request)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync();

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
            settings.DefaultVatRate = ClampVat(request.DefaultVatRate);
            settings.QuotePrefix = Required(request.QuotePrefix, "Quote prefix").ToUpperInvariant();
            settings.InvoicePrefix = Required(request.InvoicePrefix, "Invoice prefix").ToUpperInvariant();
            settings.PaymentTerms = Clean(request.PaymentTerms);
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

    private async Task<BusinessSettings> GetOrCreateSettingsAsync()
    {
        var settings = await _context.BusinessSettings.FirstOrDefaultAsync();

        if (settings is not null)
        {
            return settings;
        }

        settings = new BusinessSettings
        {
            BusinessName = "TradeLike",
            Country = "United Kingdom",
            DefaultVatRate = 20m,
            QuotePrefix = "Q",
            InvoicePrefix = "INV",
            PaymentTerms = "Payment due within 14 days.",
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
            settings.DefaultVatRate,
            settings.QuotePrefix,
            settings.InvoicePrefix,
            settings.PaymentTerms,
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

    private static void Validate(BusinessSettings settings)
    {
        ValidateMax(settings.BusinessName, 180, "Business name");
        ValidateMax(settings.LegalName, 180, "Legal name");
        ValidateMax(settings.LogoUrl, 500, "Logo URL");
        ValidateMax(settings.Email, 255, "Email");
        ValidateMax(settings.Website, 255, "Website");
        ValidateMax(settings.QuotePrefix, 20, "Quote prefix");
        ValidateMax(settings.InvoicePrefix, 20, "Invoice prefix");
        ValidateMax(settings.PaymentTerms, 1000, "Payment terms");
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
