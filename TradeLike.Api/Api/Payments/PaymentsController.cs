using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Payments;

[ApiController]
[Route("api/payments")]
public sealed class PaymentsController : ControllerBase
{
    private readonly TradeLikeDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        TradeLikeDbContext context,
        IConfiguration configuration,
        ILogger<PaymentsController> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    [Authorize(Policy = "RequireEmployeeRole")]
    [HttpPost("checkout")]
    public async Task<ActionResult<CheckoutResponse>> CreateCheckout(CheckoutRequest request)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var invoice = await _context.Invoices
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == request.InvoiceId && item.TenantId == tenantId);

        if (invoice is null) return NotFound();

        var provider = request.Provider.Trim().ToLowerInvariant();
        var secretName = provider switch
        {
            "stripe" => "STRIPE_KEY",
            "gocardless" => "GOCARDLESS_TOKEN",
            _ => string.Empty
        };

        if (secretName == string.Empty)
        {
            return BadRequest(new { error = "Provider must be stripe or gocardless." });
        }

        if (string.IsNullOrWhiteSpace(_configuration[secretName]))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = $"{provider} is not configured." });
        }

        var checkoutUrl = $"https://pay.tradelike.local/{provider}/invoice/{invoice.Id}";
        return Ok(new CheckoutResponse(checkoutUrl));
    }

    [HttpPost("stripe-webhook")]
    public async Task<IActionResult> StripeWebhook()
    {
        using var document = await JsonDocument.ParseAsync(Request.Body);
        var invoiceId = TryGetInvoiceId(document.RootElement);
        var eventType = document.RootElement.TryGetProperty("type", out var type) ? type.GetString() : null;

        if (invoiceId.HasValue)
        {
            await UpdateInvoiceStatusAsync(invoiceId.Value, eventType == "checkout.session.completed" ? "Paid" : "Sent");
        }

        _logger.LogInformation("Stripe payment webhook processed for invoice {InvoiceId}.", invoiceId);
        return Ok(new { received = true });
    }

    [HttpPost("gocardless-webhook")]
    public async Task<IActionResult> GoCardlessWebhook()
    {
        using var document = await JsonDocument.ParseAsync(Request.Body);
        var invoiceId = TryGetInvoiceId(document.RootElement);
        var action = document.RootElement.TryGetProperty("action", out var actionElement) ? actionElement.GetString() : null;

        if (invoiceId.HasValue)
        {
            await UpdateInvoiceStatusAsync(invoiceId.Value, action == "confirmed" ? "Paid" : "Sent");
        }

        _logger.LogInformation("GoCardless payment webhook processed for invoice {InvoiceId}.", invoiceId);
        return Ok(new { received = true });
    }

    private async Task UpdateInvoiceStatusAsync(int invoiceId, string status)
    {
        var invoice = await _context.Invoices.FirstOrDefaultAsync(item => item.Id == invoiceId);
        if (invoice is null) return;

        invoice.Status = status;
        if (status == "Paid")
        {
            invoice.PaidAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    private static int? TryGetInvoiceId(JsonElement root)
    {
        if (root.TryGetProperty("invoiceId", out var direct) && direct.TryGetInt32(out var invoiceId))
        {
            return invoiceId;
        }

        if (root.TryGetProperty("data", out var data) &&
            data.TryGetProperty("object", out var value) &&
            value.TryGetProperty("metadata", out var metadata) &&
            metadata.TryGetProperty("invoiceId", out var nested) &&
            int.TryParse(nested.GetString(), out invoiceId))
        {
            return invoiceId;
        }

        return null;
    }
}

public sealed record CheckoutRequest(int InvoiceId, string Provider);

public sealed record CheckoutResponse(string CheckoutUrl);
