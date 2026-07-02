using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Contracts.Storage;
using TradeLike.Api.Security;
using TradeLike.Api.Services.Storage;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireEmployeeRole")]
[Route("api/storage")]
public sealed class StorageController : ControllerBase
{
    private readonly StorageQuotaService _storageQuotaService;

    public StorageController(StorageQuotaService storageQuotaService)
    {
        _storageQuotaService = storageQuotaService;
    }

    [HttpGet("usage")]
    public async Task<ActionResult<StorageUsageResponse>> GetUsage(CancellationToken cancellationToken)
    {
        return Ok(await _storageQuotaService.GetUsageAsync(TenantHelpers.GetTenantId(HttpContext), cancellationToken));
    }

    [HttpPost("uploads/preflight")]
    public async Task<ActionResult<StoragePreflightResponse>> Preflight(
        StoragePreflightRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var result = await _storageQuotaService.CanUploadAsync(tenantId, request.SizeBytes, cancellationToken);
        if (!result.CanUpload)
        {
            return StatusCode(StatusCodes.Status402PaymentRequired, result);
        }

        return Ok(result);
    }

    [HttpPost("uploads/finalize")]
    public async Task<ActionResult<StorageObjectResponse>> FinalizeUpload(
        StorageFinalizeRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var storageObject = await _storageQuotaService.RegisterStorageObjectAsync(
                TenantHelpers.GetTenantId(HttpContext),
                request,
                TryGetCurrentUserId(),
                cancellationToken);

            return Ok(ToResponse(storageObject));
        }
        catch (StorageQuotaExceededException ex)
        {
            return StatusCode(StatusCodes.Status402PaymentRequired, new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("objects/{id:int}")]
    public async Task<IActionResult> DeleteObject(int id, CancellationToken cancellationToken)
    {
        var deleted = await _storageQuotaService.DeleteStorageObjectAsync(
            TenantHelpers.GetTenantId(HttpContext),
            id,
            TryGetCurrentUserId(),
            cancellationToken);

        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("add-ons")]
    public async Task<ActionResult<StorageCheckoutResponse>> RequestAddOn(
        StorageCheckoutRequest request,
        CancellationToken cancellationToken)
    {
        if (!request.Confirmed)
        {
            return BadRequest(new { error = "Confirm the storage add-on request before continuing." });
        }

        var addOn = await _storageQuotaService.CreatePendingStorageAddOnAsync(
            TenantHelpers.GetTenantId(HttpContext),
            request.Code,
            cancellationToken);

        var plan = addOn.StorageAddOnPlan!;
        return Ok(new StorageCheckoutResponse(
            "Storage add-on request created. Your quota increases after payment is confirmed.",
            plan.Code,
            plan.Label,
            plan.ExtraStorageBytes,
            plan.MonthlyPricePence,
            addOn.StripePriceId is null ? null : $"https://pay.tradelike.local/storage/{plan.Code}",
            true));
    }

    [HttpPost("add-ons/{id:int}/cancel")]
    public async Task<IActionResult> CancelAddOn(
        int id,
        StorageCancelAddOnRequest request,
        CancellationToken cancellationToken)
    {
        if (!request.Confirmed)
        {
            return BadRequest(new { error = "Confirm the storage add-on cancellation before continuing." });
        }

        var removed = await _storageQuotaService.RemoveStorageAddOnAsync(
            TenantHelpers.GetTenantId(HttpContext),
            id,
            cancelAtPeriodEnd: true,
            cancellationToken);

        return removed ? Ok(new { message = "Storage add-on cancellation scheduled. Existing files remain available." }) : NotFound();
    }

    private int? TryGetCurrentUserId()
    {
        var rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawUserId, out var userId) ? userId : null;
    }

    private static StorageObjectResponse ToResponse(Models.StorageObject storageObject)
    {
        return new StorageObjectResponse(
            storageObject.Id,
            storageObject.BlobKey,
            storageObject.FileName,
            storageObject.ContentType,
            storageObject.SizeBytes,
            storageObject.Category,
            storageObject.LinkedEntityType,
            storageObject.LinkedEntityId,
            storageObject.IsGenerated,
            storageObject.Status,
            storageObject.CreatedAtUtc);
    }
}
