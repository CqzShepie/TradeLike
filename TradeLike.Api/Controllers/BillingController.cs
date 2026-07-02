using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;
using TradeLike.Api.Services.Plans;

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

    [Authorize(Policy = "RequireDirectorRole")]
    [PlanGuard(Feature.Billing)]
    [HttpPost("plan-change")]
    public async Task<ActionResult<BillingPlanChangeResponse>> RequestPlanChange(
        BillingPlanChangeRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.PlanName))
        {
            return BadRequest(new { error = "Choose a plan before confirming." });
        }

        if (!request.Confirmed)
        {
            return BadRequest(new { error = "Confirm the plan change request before submitting." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var userId = TryGetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var user = await _context.Users.FirstOrDefaultAsync(
            existingUser => existingUser.Id == userId.Value && (existingUser.TenantId == tenantId || existingUser.Id == tenantId),
            cancellationToken);

        if (user is null)
        {
            return Unauthorized();
        }

        try
        {
            var planService = new SubscriptionPlanService(_context);
            var seats = await planService.GetCompatibleSeatCountAsync(user, request.PlanName, cancellationToken);
            var planChange = await planService.ApplyCustomerPlanChangeAsync(
                user,
                request.PlanName,
                seats,
                "Active",
                cancellationToken);

            await _context.AdminAuditLogs.AddAsync(new AdminAuditLog
            {
                TenantId = tenantId,
                ActorUserId = user.Id,
                ActorEmail = user.Email,
                ActorName = $"{user.FirstName} {user.LastName}".Trim(),
                ActorRole = user.Role,
                Action = "Billing plan change request",
                TargetType = "Subscription",
                TargetId = tenantId,
                TargetEmail = user.Email,
                Summary = $"Plan change requested: {planChange.OldPlan} to {planChange.NewPlan}.",
                Details = planChange.ToAuditDetails("Customer settings billing modal"),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString()
            }, cancellationToken);

            await _context.SaveChangesAsync(cancellationToken);

            var subscription = await GetSubscriptionAsync(tenantId);
            if (subscription?.Plan is null)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Plan changed, but subscription could not be reloaded." });
            }

            return Ok(new BillingPlanChangeResponse(
                "Plan change request saved. No payment has been taken in this preview flow.",
                subscription.Plan.Name,
                subscription.Plan.MonthlyPricePence,
                subscription.Plan.MaxIncludedUsers,
                subscription.SeatsPurchased,
                subscription.BillingStartUtc,
                subscription.NextInvoiceDateUtc,
                subscription.Status));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
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

    private int? TryGetCurrentUserId()
    {
        var rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawUserId, out var userId) ? userId : null;
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

public sealed record BillingPlanChangeRequest(string PlanName, bool Confirmed);

public sealed record BillingPlanChangeResponse(
    string Message,
    string PlanName,
    int? MonthlyPricePence,
    int? MaxIncludedUsers,
    int SeatsPurchased,
    DateTime BillingStartUtc,
    DateTime NextInvoiceDateUtc,
    string Status);
