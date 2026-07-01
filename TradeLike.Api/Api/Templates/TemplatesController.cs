using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Templates;

[ApiController]
[Authorize(Policy = "RequireManagerRole")]
[Route("api/templates")]
public sealed class TemplatesController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public TemplatesController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DocumentTemplateResponse>>> GetTemplates(
        [FromQuery] DocumentTemplateType? type,
        CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var query = _context.DocumentTemplates
            .AsNoTracking()
            .Where(template => template.TenantId == tenantId);

        if (type is not null)
        {
            query = query.Where(template => template.Type == type);
        }

        var templates = await query
            .OrderBy(template => template.Type)
            .ThenBy(template => template.Name)
            .Select(template => new DocumentTemplateResponse(
                template.Id,
                template.Type.ToString(),
                template.Name,
                template.HtmlTemplate,
                template.CreatedById,
                template.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(templates);
    }

    [HttpPost]
    public async Task<ActionResult<DocumentTemplateResponse>> CreateTemplate(
        CreateDocumentTemplateRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.HtmlTemplate))
        {
            return BadRequest(new { error = "Template name and HTML are required." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var userId = GetUserId(HttpContext);
        var template = new DocumentTemplate
        {
            TenantId = tenantId,
            Type = request.Type,
            Name = request.Name.Trim(),
            HtmlTemplate = request.HtmlTemplate,
            CreatedById = userId,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.DocumentTemplates.Add(template);
        await _context.SaveChangesAsync(cancellationToken);

        var response = new DocumentTemplateResponse(
            template.Id,
            template.Type.ToString(),
            template.Name,
            template.HtmlTemplate,
            template.CreatedById,
            template.CreatedAtUtc);

        return CreatedAtAction(nameof(GetTemplates), new { id = template.Id }, response);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTemplate(int id, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var template = await _context.DocumentTemplates
            .FirstOrDefaultAsync(item => item.Id == id && item.TenantId == tenantId, cancellationToken);

        if (template is null)
        {
            return NotFound();
        }

        _context.DocumentTemplates.Remove(template);
        await _context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static int GetUserId(HttpContext context)
    {
        var raw = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(raw, out var userId) ? userId : 0;
    }
}

public sealed record CreateDocumentTemplateRequest(
    DocumentTemplateType Type,
    string Name,
    string HtmlTemplate);

public sealed record DocumentTemplateResponse(
    int Id,
    string Type,
    string Name,
    string HtmlTemplate,
    int CreatedById,
    DateTime CreatedAtUtc);
