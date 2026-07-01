using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Security;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireEmployeeRole")]
[Route("api/users")]
public sealed class UsersController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public UsersController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<CustomerUserResponse>>> GetUsers()
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var users = await _context.Users
            .AsNoTracking()
            .Where(user => user.TenantId == tenantId && CustomerRoles.EmployeeRoles.Contains(user.Role))
            .OrderBy(user => user.FirstName)
            .ThenBy(user => user.LastName)
            .Select(user => new CustomerUserResponse(
                user.Id,
                user.Email,
                (user.FirstName + " " + user.LastName).Trim(),
                user.Role,
                user.AccountStatus))
            .ToListAsync();

        return Ok(users);
    }

    [HttpPut("{id:int}/role")]
    [Authorize(Policy = "RequireDirectorRole")]
    public async Task<ActionResult<CustomerUserResponse>> UpdateRole(int id, UpdateCustomerUserRoleRequest request)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        string nextRole;

        try
        {
            nextRole = CleanRole(request.Role);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(existing => existing.Id == id && existing.TenantId == tenantId);

        if (user is null)
        {
            return NotFound();
        }

        if (nextRole == CustomerRoles.Manager && user.Role != CustomerRoles.Manager)
        {
            var subscription = await _context.Subscriptions
                .AsNoTracking()
                .Include(item => item.Plan)
                .FirstOrDefaultAsync(item => item.TenantId == tenantId);

            if (subscription?.Plan is null)
            {
                return UpgradeRequired();
            }

            var managerSeats = await _context.Users
                .AsNoTracking()
                .CountAsync(existing => existing.TenantId == tenantId && existing.Role == CustomerRoles.Manager);

            var managersAllowed = subscription.Plan.Name.Trim().ToLowerInvariant() switch
            {
                "solo" => 0,
                "team" or "business" => subscription.SeatsPurchased,
                "enterprise" => int.MaxValue,
                _ => 0
            };

            if (managerSeats >= managersAllowed)
            {
                return UpgradeRequired();
            }
        }

        user.Role = nextRole;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new CustomerUserResponse(
            user.Id,
            user.Email,
            $"{user.FirstName} {user.LastName}".Trim(),
            user.Role,
            user.AccountStatus));
    }

    private static string CleanRole(string role)
    {
        var cleaned = role.Trim();

        return cleaned switch
        {
            CustomerRoles.Manager => CustomerRoles.Manager,
            CustomerRoles.Employee => CustomerRoles.Employee,
            _ => throw new ArgumentException("Role must be CustomerManager or CustomerEmployee.")
        };
    }

    private static ObjectResult UpgradeRequired()
    {
        return new ObjectResult(new { error = "Upgrade required" })
        {
            StatusCode = StatusCodes.Status402PaymentRequired
        };
    }
}

public sealed record CustomerUserResponse(
    int Id,
    string Email,
    string Name,
    string Role,
    string Status);

public sealed record UpdateCustomerUserRoleRequest(string Role);
