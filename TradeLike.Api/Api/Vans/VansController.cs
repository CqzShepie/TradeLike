using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Vans;

[ApiController]
[Authorize(Policy = "RequireEmployeeRole")]
[Route("api/vans")]
public sealed class VansController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public VansController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<VanResponse>>> GetVans()
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var vans = await _context.Vans
            .AsNoTracking()
            .Include(van => van.Stock)
                .ThenInclude(stock => stock.Product)
            .Where(van => van.TenantId == tenantId)
            .OrderBy(van => van.Name)
            .Select(van => ToResponse(van))
            .ToListAsync();

        return Ok(vans);
    }

    [HttpPost]
    public async Task<ActionResult<VanResponse>> CreateVan(CreateVanRequest request)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var van = new Van
        {
            TenantId = tenantId,
            Name = request.Name.Trim(),
            Registration = request.Registration?.Trim() ?? string.Empty,
            EngineerId = request.EngineerId
        };

        if (string.IsNullOrWhiteSpace(van.Name))
        {
            return BadRequest(new { error = "Van name is required." });
        }

        _context.Vans.Add(van);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetVans), new { id = van.Id }, ToResponse(van));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<VanResponse>> UpdateVan(int id, UpdateVanRequest request)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var van = await _context.Vans.FirstOrDefaultAsync(item => item.Id == id && item.TenantId == tenantId);
        if (van is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            van.Name = request.Name.Trim();
        }

        if (request.Registration is not null)
        {
            van.Registration = request.Registration.Trim();
        }

        van.EngineerId = request.EngineerId;
        await _context.SaveChangesAsync();

        return Ok(ToResponse(van));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteVan(int id)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var van = await _context.Vans.FirstOrDefaultAsync(item => item.Id == id && item.TenantId == tenantId);
        if (van is null) return NotFound();

        _context.Vans.Remove(van);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/stock/transfer")]
    public async Task<ActionResult<VanResponse>> TransferStock(int id, TransferVanStockRequest request)
    {
        if (request.Qty <= 0)
        {
            return BadRequest(new { error = "Quantity must be greater than zero." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var source = await _context.Vans
            .Include(van => van.Stock)
                .ThenInclude(stock => stock.Product)
            .FirstOrDefaultAsync(van => van.Id == id && van.TenantId == tenantId);

        if (source is null) return NotFound();

        var productExists = await _context.Products
            .AnyAsync(product => product.Id == request.ProductId && product.TenantId == tenantId);

        if (!productExists)
        {
            return BadRequest(new { error = "Product was not found." });
        }

        var sourceStock = source.Stock.FirstOrDefault(stock => stock.ProductId == request.ProductId);
        if (sourceStock is null || sourceStock.Qty < request.Qty)
        {
            return BadRequest(new { error = "Not enough stock in this van." });
        }

        sourceStock.Qty -= request.Qty;

        if (request.ToVanId.HasValue)
        {
            var destination = await _context.Vans
                .Include(van => van.Stock)
                .FirstOrDefaultAsync(van => van.Id == request.ToVanId.Value && van.TenantId == tenantId);

            if (destination is null) return BadRequest(new { error = "Destination van was not found." });

            var destinationStock = destination.Stock.FirstOrDefault(stock => stock.ProductId == request.ProductId);
            if (destinationStock is null)
            {
                destination.Stock.Add(new VanStock
                {
                    TenantId = tenantId,
                    ProductId = request.ProductId,
                    Qty = request.Qty
                });
            }
            else
            {
                destinationStock.Qty += request.Qty;
            }
        }

        await _context.SaveChangesAsync();

        var updated = await _context.Vans
            .AsNoTracking()
            .Include(van => van.Stock)
                .ThenInclude(stock => stock.Product)
            .FirstAsync(van => van.Id == id && van.TenantId == tenantId);

        return Ok(ToResponse(updated));
    }

    private static VanResponse ToResponse(Van van)
    {
        return new VanResponse(
            van.Id,
            van.Name,
            van.Registration,
            van.EngineerId,
            van.Stock.Select(stock => new VanStockResponse(
                stock.Id,
                stock.ProductId,
                stock.Product?.Name ?? $"Product {stock.ProductId}",
                stock.Product?.Sku ?? string.Empty,
                stock.Qty)).ToList());
    }
}

public sealed record CreateVanRequest(string Name, string? Registration, int? EngineerId);

public sealed record UpdateVanRequest(string? Name, string? Registration, int? EngineerId);

public sealed record TransferVanStockRequest(int ProductId, int Qty, int? ToVanId);

public sealed record VanResponse(int Id, string Name, string Registration, int? EngineerId, IReadOnlyList<VanStockResponse> Stock);

public sealed record VanStockResponse(int Id, int ProductId, string ProductName, string Sku, int Qty);
