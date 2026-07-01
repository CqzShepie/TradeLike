using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Webhooks;

[ApiController]
[Authorize(Policy = "RequireManagerRole")]
[Route("api/webhooks/workflows")]
public sealed class WebhookWorkflowsController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly TradeLikeDbContext _context;

    public WebhookWorkflowsController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WebhookWorkflowResponse>>> List(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var rows = await _context.WebhookWorkflows
            .AsNoTracking()
            .Where(workflow => workflow.TenantId == tenantId)
            .OrderByDescending(workflow => workflow.CreatedAtUtc)
            .Select(workflow => ToResponse(workflow))
            .ToListAsync(cancellationToken);

        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> Create(SaveWebhookWorkflowRequest request, CancellationToken cancellationToken)
    {
        var validation = Validate(request);
        if (validation is not null)
        {
            return BadRequest(new { error = validation });
        }

        var workflow = new WebhookWorkflow
        {
            TenantId = TenantHelpers.GetTenantId(HttpContext),
            Name = request.Name.Trim(),
            TriggerEvent = request.TriggerEvent.Trim(),
            FilterJson = NormalizeJson(request.FilterJson),
            TransformJson = NormalizeJson(request.TransformJson),
            TargetUrl = request.TargetUrl.Trim(),
            SignatureSecret = string.IsNullOrWhiteSpace(request.SignatureSecret)
                ? $"whlow_{Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant()}"
                : request.SignatureSecret.Trim(),
            Enabled = request.Enabled,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.WebhookWorkflows.Add(workflow);
        await _context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(Get), new { id = workflow.Id }, ToResponse(workflow));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken cancellationToken)
    {
        var workflow = await Load(id, cancellationToken);
        return workflow is null ? NotFound() : Ok(ToResponse(workflow));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, SaveWebhookWorkflowRequest request, CancellationToken cancellationToken)
    {
        var validation = Validate(request);
        if (validation is not null)
        {
            return BadRequest(new { error = validation });
        }

        var workflow = await Load(id, cancellationToken);
        if (workflow is null)
        {
            return NotFound();
        }

        workflow.Name = request.Name.Trim();
        workflow.TriggerEvent = request.TriggerEvent.Trim();
        workflow.FilterJson = NormalizeJson(request.FilterJson);
        workflow.TransformJson = NormalizeJson(request.TransformJson);
        workflow.TargetUrl = request.TargetUrl.Trim();
        workflow.SignatureSecret = string.IsNullOrWhiteSpace(request.SignatureSecret)
            ? workflow.SignatureSecret
            : request.SignatureSecret.Trim();
        workflow.Enabled = request.Enabled;

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(workflow));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Disable(int id, CancellationToken cancellationToken)
    {
        var workflow = await Load(id, cancellationToken);
        if (workflow is null)
        {
            return NotFound();
        }

        workflow.Enabled = false;
        await _context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("preview")]
    public ActionResult<WebhookPreviewResponse> Preview(WebhookPreviewRequest request)
    {
        var payload = request.SamplePayload.ValueKind == JsonValueKind.Undefined
            ? JsonSerializer.SerializeToElement(new { })
            : request.SamplePayload;
        var matches = WebhookWorkflowEngine.Matches(NormalizeJson(request.FilterJson), payload);
        var transformed = matches
            ? WebhookWorkflowEngine.Transform(NormalizeJson(request.TransformJson), payload)
            : JsonSerializer.SerializeToElement(new { skipped = true });

        return Ok(new WebhookPreviewResponse(matches, transformed));
    }

    [HttpPost("{id:int}/test")]
    public async Task<IActionResult> Test(int id, WebhookTestRequest request, CancellationToken cancellationToken)
    {
        var workflow = await Load(id, cancellationToken);
        if (workflow is null)
        {
            return NotFound();
        }

        var payload = request.Payload.ValueKind == JsonValueKind.Undefined
            ? JsonSerializer.SerializeToElement(new { })
            : request.Payload;
        var queued = await WebhookWorkflowQueue.QueueAsync(
            _context,
            workflow.TenantId,
            request.EventName,
            payload,
            cancellationToken);

        return Accepted(new { queued });
    }

    private async Task<WebhookWorkflow?> Load(int id, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        return await _context.WebhookWorkflows
            .FirstOrDefaultAsync(workflow => workflow.Id == id && workflow.TenantId == tenantId, cancellationToken);
    }

    private static string? Validate(SaveWebhookWorkflowRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Webhook name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.TriggerEvent))
        {
            return "Trigger event is required.";
        }

        if (!Uri.TryCreate(request.TargetUrl, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            return "Target URL must be an absolute HTTP or HTTPS URL.";
        }

        try
        {
            _ = JsonDocument.Parse(NormalizeJson(request.FilterJson));
            _ = JsonDocument.Parse(NormalizeJson(request.TransformJson));
        }
        catch (JsonException)
        {
            return "Filter and transform must be valid JSON.";
        }

        return null;
    }

    private static string NormalizeJson(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? "{}" : value.Trim();
    }

    private static WebhookWorkflowResponse ToResponse(WebhookWorkflow workflow)
    {
        return new WebhookWorkflowResponse(
            workflow.Id,
            workflow.Name,
            workflow.TriggerEvent,
            workflow.FilterJson,
            workflow.TransformJson,
            workflow.TargetUrl,
            workflow.SignatureSecret,
            workflow.Enabled,
            workflow.CreatedAtUtc,
            workflow.LastQueuedAtUtc);
    }
}

public sealed record SaveWebhookWorkflowRequest(
    string Name,
    string TriggerEvent,
    string? FilterJson,
    string? TransformJson,
    string TargetUrl,
    string? SignatureSecret,
    bool Enabled);

public sealed record WebhookWorkflowResponse(
    int Id,
    string Name,
    string TriggerEvent,
    string FilterJson,
    string TransformJson,
    string TargetUrl,
    string SignatureSecret,
    bool Enabled,
    DateTime CreatedAtUtc,
    DateTime? LastQueuedAtUtc);

public sealed record WebhookPreviewRequest(
    string? FilterJson,
    string? TransformJson,
    JsonElement SamplePayload);

public sealed record WebhookPreviewResponse(
    bool Matches,
    JsonElement Payload);

public sealed record WebhookTestRequest(
    string EventName,
    JsonElement Payload);
