using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Companies;

public static class CompanyAccess
{
    public static bool IsDirector(ClaimsPrincipal user)
    {
        return user.IsInRole(CustomerRoles.Director);
    }

    public static async Task<bool> CanAccessCompanyAsync(
        TradeLikeDbContext context,
        ClaimsPrincipal user,
        int tenantId,
        int companyId,
        CancellationToken cancellationToken)
    {
        if (IsDirector(user))
        {
            return await context.Companies.AnyAsync(company => company.Id == companyId && company.TenantId == tenantId, cancellationToken);
        }

        var visible = await GetVisibleCompanyIdsAsync(context, user, tenantId, cancellationToken);
        return visible.Contains(companyId);
    }

    public static async Task<bool> CanAccessJobAsync(
        TradeLikeDbContext context,
        ClaimsPrincipal user,
        Job job,
        CancellationToken cancellationToken)
    {
        if (IsDirector(user))
        {
            return true;
        }

        var companyId = context.Entry(job).Property<int?>("CompanyId").CurrentValue;
        if (companyId is null)
        {
            return false;
        }

        var visible = await GetVisibleCompanyIdsAsync(context, user, job.TenantId, cancellationToken);
        return visible.Contains(companyId.Value);
    }

    public static async Task<HashSet<int>> GetVisibleCompanyIdsAsync(
        TradeLikeDbContext context,
        ClaimsPrincipal user,
        int tenantId,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId(user);
        var assigned = await context.CompanyUsers
            .AsNoTracking()
            .Where(companyUser => companyUser.UserId == userId && companyUser.Company!.TenantId == tenantId)
            .Select(companyUser => companyUser.CompanyId)
            .ToListAsync(cancellationToken);

        var companies = await context.Companies
            .AsNoTracking()
            .Where(company => company.TenantId == tenantId && company.IsActive)
            .Select(company => new { company.Id, company.ParentCompanyId })
            .ToListAsync(cancellationToken);

        var visible = assigned.ToHashSet();
        var changed = true;

        while (changed)
        {
            changed = false;
            foreach (var company in companies)
            {
                if (company.ParentCompanyId is not null &&
                    visible.Contains(company.ParentCompanyId.Value) &&
                    visible.Add(company.Id))
                {
                    changed = true;
                }
            }
        }

        return visible;
    }

    private static int GetUserId(ClaimsPrincipal user)
    {
        return int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) ? userId : 0;
    }
}
