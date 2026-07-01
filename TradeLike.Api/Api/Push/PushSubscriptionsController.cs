using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Push;

[ApiController]
[Route("api/push")]
[Authorize(Policy = "RequireEmployeeRole")]
public class PushSubscriptionsController : ControllerBase
{
    private readonly TradeLikeDbContext _db;

    public PushSubscriptionsController(TradeLikeDbContext db)
    {
        _db = db;
    }

    [HttpPost("subscribe")]
    public async Task<ActionResult<PushSubscriptionResponse>> Subscribe(
        SavePushSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Endpoint) ||
            string.IsNullOrWhiteSpace(request.P256dh) ||
            string.IsNullOrWhiteSpace(request.Auth))
        {
            return BadRequest(new { error = "Push subscription details are required." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var userId = GetUserId();
        var endpoint = request.Endpoint.Trim();
        var subscription = await _db.PushSubscriptions
            .FirstOrDefaultAsync(item => item.Endpoint == endpoint, cancellationToken);

        if (subscription is null)
        {
            subscription = new PushSubscription
            {
                TenantId = tenantId,
                UserId = userId,
                Endpoint = endpoint,
                CreatedAtUtc = DateTime.UtcNow
            };
            _db.PushSubscriptions.Add(subscription);
        }

        subscription.TenantId = tenantId;
        subscription.UserId = userId;
        subscription.P256dh = request.P256dh.Trim();
        subscription.Auth = request.Auth.Trim();

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(subscription));
    }

    [HttpDelete("unsubscribe/{id:int}")]
    public async Task<IActionResult> Unsubscribe(int id, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var userId = GetUserId();
        var subscription = await _db.PushSubscriptions.FirstOrDefaultAsync(
            item => item.Id == id && item.TenantId == tenantId && item.UserId == userId,
            cancellationToken);

        if (subscription is null)
        {
            return NotFound();
        }

        _db.PushSubscriptions.Remove(subscription);
        await _db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private int GetUserId()
    {
        return int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) && userId > 0
            ? userId
            : TenantHelpers.GetTenantId(HttpContext);
    }

    private static PushSubscriptionResponse ToResponse(PushSubscription subscription)
    {
        return new PushSubscriptionResponse(subscription.Id, subscription.Endpoint, subscription.CreatedAtUtc);
    }
}

public sealed record SavePushSubscriptionRequest(string Endpoint, string P256dh, string Auth);

public sealed record PushSubscriptionResponse(int Id, string Endpoint, DateTime CreatedAtUtc);
