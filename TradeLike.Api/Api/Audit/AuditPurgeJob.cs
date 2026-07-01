using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;

namespace TradeLike.Api.Api.Audit;

public sealed class AuditPurgeJob : BackgroundService
{
    private static readonly TimeSpan PurgePeriod = TimeSpan.FromHours(24);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuditPurgeJob> _logger;

    public AuditPurgeJob(IServiceScopeFactory scopeFactory, ILogger<AuditPurgeJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await PurgeOnceAsync(stoppingToken);

        using var timer = new PeriodicTimer(PurgePeriod);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await PurgeOnceAsync(stoppingToken);
        }
    }

    public async Task<int> PurgeOnceAsync(CancellationToken cancellationToken = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TradeLikeDbContext>();
        var retentionDays = await db.BusinessSettings
            .AsNoTracking()
            .Select(settings => settings.LogRetentionDays)
            .FirstOrDefaultAsync(cancellationToken);

        if (retentionDays <= 0)
        {
            retentionDays = 365;
        }

        var cutoff = DateTime.UtcNow.AddDays(-retentionDays);
        var deleted = await db.AdminAuditLogs
            .Where(log => (log.CreatedAtUtc == default ? log.CreatedAt : log.CreatedAtUtc) < cutoff)
            .ExecuteDeleteAsync(cancellationToken);

        if (deleted > 0)
        {
            _logger.LogInformation("Purged {AuditLogCount} audit logs older than {RetentionDays} days.", deleted, retentionDays);
        }

        return deleted;
    }
}
