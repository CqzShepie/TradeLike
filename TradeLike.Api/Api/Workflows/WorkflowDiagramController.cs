using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Workflows;

[ApiController]
[Authorize(Policy = "RequireManagerRole")]
[Route("api/workflows")]
public sealed class WorkflowDiagramController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly TradeLikeDbContext _context;

    public WorkflowDiagramController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet("{id:int}/diagram")]
    public async Task<ActionResult<WorkflowDiagramRequest>> GetDiagram(int id, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var workflow = await _context.Workflows
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id && item.TenantId == tenantId, cancellationToken);

        if (workflow is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(workflow.DiagramJson))
        {
            return Ok(new WorkflowDiagramRequest([], []));
        }

        return Ok(JsonSerializer.Deserialize<WorkflowDiagramRequest>(workflow.DiagramJson, JsonOptions) ?? new WorkflowDiagramRequest([], []));
    }

    [HttpPut("{id:int}/diagram")]
    public async Task<IActionResult> SaveDiagram(
        int id,
        [FromBody] WorkflowDiagramRequest request,
        CancellationToken cancellationToken)
    {
        var validation = WorkflowDiagramValidator.Validate(request);
        if (validation.Count > 0)
        {
            return BadRequest(new { errors = validation });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var workflow = await _context.Workflows
            .FirstOrDefaultAsync(item => item.Id == id && item.TenantId == tenantId, cancellationToken);

        if (workflow is null)
        {
            return NotFound();
        }

        workflow.DiagramJson = JsonSerializer.Serialize(request, JsonOptions);
        workflow.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(request);
    }
}
