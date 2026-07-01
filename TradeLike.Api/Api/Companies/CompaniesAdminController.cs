using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Companies;

[ApiController]
[Authorize(Policy = "RequireEmployeeRole")]
[Route("api/companies")]
public sealed class CompaniesAdminController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public CompaniesAdminController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CompanyTreeNodeResponse>>> Tree(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var query = _context.Companies
            .AsNoTracking()
            .Where(company => company.TenantId == tenantId && company.IsActive);

        if (!CompanyAccess.IsDirector(User))
        {
            var visible = await CompanyAccess.GetVisibleCompanyIdsAsync(_context, User, tenantId, cancellationToken);
            query = query.Where(company => visible.Contains(company.Id));
        }

        var companies = await query
            .OrderBy(company => company.ParentCompanyId)
            .ThenBy(company => company.Name)
            .Select(company => new CompanyFlatResponse(
                company.Id,
                company.ParentCompanyId,
                company.Name,
                company.Type,
                company.IsActive,
                company.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(BuildTree(companies));
    }

    [Authorize(Policy = "RequireDirectorRole")]
    [HttpPost]
    public async Task<ActionResult<CompanyFlatResponse>> CreateBranch(CreateCompanyRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { error = "Branch name is required." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        if (request.ParentCompanyId is not null &&
            !await _context.Companies.AnyAsync(company => company.Id == request.ParentCompanyId && company.TenantId == tenantId, cancellationToken))
        {
            return BadRequest(new { error = "Parent branch does not exist." });
        }

        var company = new Company
        {
            TenantId = tenantId,
            ParentCompanyId = request.ParentCompanyId,
            Name = request.Name.Trim(),
            Type = request.Type.Trim().Length == 0 ? "Branch" : request.Type.Trim(),
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Companies.Add(company);
        await _context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(Tree), new CompanyFlatResponse(
            company.Id,
            company.ParentCompanyId,
            company.Name,
            company.Type,
            company.IsActive,
            company.CreatedAtUtc));
    }

    [HttpGet("{id:int}/users")]
    public async Task<IActionResult> Users(int id, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        if (!await CompanyAccess.CanAccessCompanyAsync(_context, User, tenantId, id, cancellationToken))
        {
            return NotFound();
        }

        var users = await _context.CompanyUsers
            .AsNoTracking()
            .Include(companyUser => companyUser.Company)
            .Where(companyUser => companyUser.CompanyId == id && companyUser.Company!.TenantId == tenantId)
            .Join(
                _context.Users,
                companyUser => companyUser.UserId,
                user => user.Id,
                (companyUser, user) => new CompanyUserResponse(
                    companyUser.Id,
                    companyUser.CompanyId,
                    user.Id,
                    $"{user.FirstName} {user.LastName}".Trim(),
                    user.Email,
                    companyUser.Role.ToString()))
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    [Authorize(Policy = "RequireDirectorRole")]
    [HttpPost("{id:int}/users")]
    public async Task<IActionResult> InviteUser(int id, InviteCompanyUserRequest request, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        if (!await _context.Companies.AnyAsync(company => company.Id == id && company.TenantId == tenantId, cancellationToken))
        {
            return NotFound();
        }

        if (!await _context.Users.AnyAsync(user => user.Id == request.UserId && user.TenantId == tenantId, cancellationToken))
        {
            return BadRequest(new { error = "User does not belong to this tenant." });
        }

        var existing = await _context.CompanyUsers
            .FirstOrDefaultAsync(companyUser => companyUser.CompanyId == id && companyUser.UserId == request.UserId, cancellationToken);

        if (existing is null)
        {
            existing = new CompanyUser
            {
                CompanyId = id,
                UserId = request.UserId,
                CreatedAtUtc = DateTime.UtcNow
            };
            _context.CompanyUsers.Add(existing);
        }

        existing.Role = Enum.TryParse<CompanyRole>(request.Role, ignoreCase: true, out var role)
            ? role
            : CompanyRole.Staff;

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { existing.Id, existing.CompanyId, existing.UserId, Role = existing.Role.ToString() });
    }

    [Authorize(Policy = "RequireDirectorRole")]
    [HttpDelete("{id:int}/users/{userId:int}")]
    public async Task<IActionResult> RemoveUser(int id, int userId, CancellationToken cancellationToken)
    {
        var link = await _context.CompanyUsers
            .FirstOrDefaultAsync(companyUser => companyUser.CompanyId == id && companyUser.UserId == userId, cancellationToken);

        if (link is null)
        {
            return NotFound();
        }

        _context.CompanyUsers.Remove(link);
        await _context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:int}/settings")]
    public async Task<IActionResult> Settings(int id, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        if (!await CompanyAccess.CanAccessCompanyAsync(_context, User, tenantId, id, cancellationToken))
        {
            return NotFound();
        }

        var settings = await _context.CompanySettings
            .AsNoTracking()
            .Where(setting => setting.CompanyId == id)
            .OrderBy(setting => setting.SettingKey)
            .Select(setting => new CompanySettingResponse(setting.SettingKey, setting.SettingValue))
            .ToListAsync(cancellationToken);

        return Ok(settings);
    }

    [Authorize(Policy = "RequireDirectorRole")]
    [HttpPut("{id:int}/settings")]
    public async Task<IActionResult> SaveSettings(int id, SaveCompanySettingsRequest request, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        if (!await _context.Companies.AnyAsync(company => company.Id == id && company.TenantId == tenantId, cancellationToken))
        {
            return NotFound();
        }

        var existing = await _context.CompanySettings
            .Where(setting => setting.CompanyId == id)
            .ToListAsync(cancellationToken);

        foreach (var item in request.Settings)
        {
            var setting = existing.FirstOrDefault(row => row.SettingKey == item.SettingKey);
            if (setting is null)
            {
                _context.CompanySettings.Add(new CompanySetting
                {
                    CompanyId = id,
                    SettingKey = item.SettingKey.Trim(),
                    SettingValue = item.SettingValue
                });
            }
            else
            {
                setting.SettingValue = item.SettingValue;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static IReadOnlyList<CompanyTreeNodeResponse> BuildTree(IReadOnlyList<CompanyFlatResponse> companies)
    {
        return companies
            .Where(company => company.ParentCompanyId is null || companies.All(candidate => candidate.Id != company.ParentCompanyId))
            .Select(company => BuildNode(company, companies))
            .ToList();
    }

    private static CompanyTreeNodeResponse BuildNode(CompanyFlatResponse company, IReadOnlyList<CompanyFlatResponse> companies)
    {
        return new CompanyTreeNodeResponse(
            company.Id,
            company.ParentCompanyId,
            company.Name,
            company.Type,
            company.IsActive,
            company.CreatedAtUtc,
            companies
                .Where(child => child.ParentCompanyId == company.Id)
                .Select(child => BuildNode(child, companies))
                .ToList());
    }
}

public sealed record CreateCompanyRequest(string Name, int? ParentCompanyId, string Type);

public sealed record CompanyFlatResponse(
    int Id,
    int? ParentCompanyId,
    string Name,
    string Type,
    bool IsActive,
    DateTime CreatedAtUtc);

public sealed record CompanyTreeNodeResponse(
    int Id,
    int? ParentCompanyId,
    string Name,
    string Type,
    bool IsActive,
    DateTime CreatedAtUtc,
    IReadOnlyList<CompanyTreeNodeResponse> Children);

public sealed record InviteCompanyUserRequest(int UserId, string Role);

public sealed record CompanyUserResponse(
    int Id,
    int CompanyId,
    int UserId,
    string Name,
    string Email,
    string Role);

public sealed record SaveCompanySettingsRequest(IReadOnlyList<CompanySettingResponse> Settings);

public sealed record CompanySettingResponse(string SettingKey, string SettingValue);
