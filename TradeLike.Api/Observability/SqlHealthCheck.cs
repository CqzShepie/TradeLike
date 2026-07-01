using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using TradeLike.Api.Data;

namespace TradeLike.Api.Observability;

public sealed class SqlHealthCheck : IHealthCheck
{
    private readonly TradeLikeDbContext _context;

    public SqlHealthCheck(TradeLikeDbContext context)
    {
        _context = context;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var canConnect = await _context.Database.CanConnectAsync(cancellationToken);

            return canConnect
                ? HealthCheckResult.Healthy("SQL connection is available.")
                : HealthCheckResult.Unhealthy("SQL connection failed.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("SQL connection failed.", ex);
        }
    }
}
