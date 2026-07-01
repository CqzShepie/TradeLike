using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Security;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/billing")]
public sealed class BillingController : ControllerBase
{
    private readonly TradeLikeDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<BillingController> _logger;

    public BillingController(TradeLikeDbContext context, IConfiguration configuration, ILogger<BillingController> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    [Authorize(Policy = "RequireDirectorRole")]
    [PlanGuard(Feature.Billing)]
    [HttpGet("subscription")]
    public async Task<ActionResult<BillingSubscriptionResponse>> GetSubscription()
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var subscription = await GetSubscriptionAsync(tenantId);

        if (subscription?.Plan is null)
        {
            return NotFound();
        }

        return Ok(new BillingSubscriptionResponse(
            subscription.Plan.Name,
            subscription.Plan.MonthlyPricePence,
            subscription.Plan.MaxIncludedUsers,
            subscription.SeatsPurchased,
            subscription.BillingStartUtc,
            subscription.NextInvoiceDateUtc,
            subscription.Status));
    }

    [HttpPost("stripe-webhook")]
    public async Task<IActionResult> StripeWebhook()
    {
        var secret = _configuration["STRIPE_WEBHOOK_SECRET"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Stripe webhook secret is not configured." });
        }

        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var payload = await reader.ReadToEndAsync();
        var signatureHeader = Request.Headers["Stripe-Signature"].ToString();

        if (!VerifyStripeSignature(payload, signatureHeader, secret))
        {
            return Unauthorized(new { error = "Invalid Stripe signature." });
        }

        _logger.LogInformation("Stripe webhook payload: {Payload}", payload);

        using var document = JsonDocument.Parse(payload);
        var eventType = document.RootElement.GetProperty("type").GetString();
        var tenantId = TryGetTenantId(document.RootElement);

        if (tenantId.HasValue && eventType is "invoice.paid" or "invoice.payment_failed")
        {
            var subscription = await _context.Subscriptions
                .FirstOrDefaultAsync(item => item.TenantId == tenantId.Value);

            if (subscription is not null)
            {
                subscription.Status = eventType == "invoice.paid" ? "Active" : "PastDue";
                await _context.SaveChangesAsync();
            }
        }

        return Ok(new { received = true });
    }

    private async Task<Models.Subscription?> GetSubscriptionAsync(int tenantId)
    {
        return await _context.Subscriptions
            .AsNoTracking()
            .Include(item => item.Plan)
            .FirstOrDefaultAsync(item => item.TenantId == tenantId);
    }

    private static int? TryGetTenantId(JsonElement root)
    {
        if (!root.TryGetProperty("data", out var data) ||
            !data.TryGetProperty("object", out var stripeObject))
        {
            return null;
        }

        if (stripeObject.TryGetProperty("metadata", out var metadata) &&
            metadata.TryGetProperty("tenantId", out var tenantIdProperty) &&
            int.TryParse(tenantIdProperty.GetString(), out var tenantId))
        {
            return tenantId;
        }

        return null;
    }

    private static bool VerifyStripeSignature(string payload, string signatureHeader, string secret)
    {
        var timestamp = signatureHeader
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault(part => part.StartsWith("t=", StringComparison.OrdinalIgnoreCase))?
            .Split('=')[1];

        var signature = signatureHeader
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault(part => part.StartsWith("v1=", StringComparison.OrdinalIgnoreCase))?
            .Split('=')[1];

        if (string.IsNullOrWhiteSpace(timestamp) || string.IsNullOrWhiteSpace(signature))
        {
            return false;
        }

        var signedPayload = $"{timestamp}.{payload}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var computed = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload))).ToLowerInvariant();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computed),
            Encoding.UTF8.GetBytes(signature.ToLowerInvariant()));
    }
}

public sealed record BillingSubscriptionResponse(
    string PlanName,
    int? MonthlyPricePence,
    int? MaxIncludedUsers,
    int SeatsPurchased,
    DateTime BillingStartUtc,
    DateTime NextInvoiceDateUtc,
    string Status);
