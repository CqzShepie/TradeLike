using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Api.Templates;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Documents;

[ApiController]
[Authorize(Policy = "RequireEmployeeRole")]
[Route("api/documents")]
public sealed class DocumentsController : ControllerBase
{
    private readonly TradeLikeDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public DocumentsController(
        TradeLikeDbContext context,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        _context = context;
        _configuration = configuration;
        _environment = environment;
    }

    [HttpPost("generate")]
    public async Task<ActionResult<GenerateDocumentResponse>> Generate(
        GenerateDocumentRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var userId = GetUserId(HttpContext);
        var template = await _context.DocumentTemplates
            .FirstOrDefaultAsync(item => item.Id == request.TemplateId && item.TenantId == tenantId, cancellationToken);

        if (template is null)
        {
            return NotFound(new { error = "Template was not found." });
        }

        var engine = new TemplateEngine(_context);
        var html = await engine.RenderForEntityAsync(template, request.EntityType, request.EntityId, tenantId, cancellationToken);
        var renderer = new PdfRenderService(_configuration, _environment);
        var fileStem = $"{request.EntityType.ToString().ToLowerInvariant()}-{request.EntityId}-{Guid.NewGuid():N}";
        var pdfPath = await renderer.RenderHtmlToPdfAsync(html, tenantId, fileStem, cancellationToken);

        var document = new GeneratedDocument
        {
            TenantId = tenantId,
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            PdfUrl = pdfPath,
            GeneratedAtUtc = DateTime.UtcNow,
            GeneratedById = userId
        };

        _context.GeneratedDocuments.Add(document);
        await _context.SaveChangesAsync(cancellationToken);

        return Accepted(new GenerateDocumentResponse(document.Id));
    }

    [HttpGet("{id:int}/download")]
    public async Task<IActionResult> Download(int id, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var document = await _context.GeneratedDocuments
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id && item.TenantId == tenantId, cancellationToken);

        if (document is null)
        {
            return NotFound();
        }

        if (!System.IO.File.Exists(document.PdfUrl))
        {
            return NotFound(new { error = "PDF file is no longer available in configured storage." });
        }

        var fileName = $"{document.EntityType}-{document.EntityId}-{document.Id}.pdf";
        return PhysicalFile(document.PdfUrl, "application/pdf", fileName);
    }

    private static int GetUserId(HttpContext context)
    {
        var raw = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(raw, out var userId) ? userId : 0;
    }
}

public sealed record GenerateDocumentRequest(
    GeneratedDocumentEntityType EntityType,
    int EntityId,
    int TemplateId);

public sealed record GenerateDocumentResponse(int DocumentId);
