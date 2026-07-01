using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;

namespace TradeLike.Api.Api.Usage;

public sealed class UsageCounterStore
{
    private readonly ConcurrentDictionary<UsageKey, UsageCounter> _dailyCounters = new();
    private readonly ConcurrentDictionary<SecondKey, int> _secondCounters = new();

    public UsageCheckResult TrackRequest(int tenantId, string plan)
    {
        var now = DateTimeOffset.UtcNow;
        var limit = PlanRateLimits.Resolve(plan);
        var periodStart = now.UtcDateTime.Date;
        var dayKey = new UsageKey(tenantId, periodStart);
        var dayCounter = _dailyCounters.GetOrAdd(dayKey, _ => new UsageCounter());
        var requestsToday = Interlocked.Increment(ref dayCounter.Requests);
        var secondKey = new SecondKey(tenantId, now.ToUnixTimeSeconds());
        var requestsThisSecond = _secondCounters.AddOrUpdate(secondKey, 1, (_, current) => current + 1);

        if (requestsThisSecond > limit.RequestsPerSecond)
        {
            return UsageCheckResult.Blocked(now.AddSeconds(1));
        }

        if (limit.DailyRequestLimit is not null && requestsToday > limit.DailyRequestLimit)
        {
            return UsageCheckResult.Blocked(new DateTimeOffset(periodStart.AddDays(1), TimeSpan.Zero));
        }

        CleanupSecondCounters(now.ToUnixTimeSeconds());

        return UsageCheckResult.Allowed(requestsToday, limit);
    }

    public IReadOnlyDictionary<UsageKey, UsageCounterSnapshot> SnapshotAndReset()
    {
        var snapshot = _dailyCounters.ToDictionary(
            item => item.Key,
            item => new UsageCounterSnapshot(
                Interlocked.Exchange(ref item.Value.Requests, 0),
                Interlocked.Exchange(ref item.Value.ExportCalls, 0),
                Interlocked.Exchange(ref item.Value.AutomationRuns, 0)));

        foreach (var item in snapshot.Where(item => item.Value.IsEmpty))
        {
            _dailyCounters.TryRemove(item.Key, out _);
        }

        return snapshot
            .Where(item => !item.Value.IsEmpty)
            .ToDictionary(item => item.Key, item => item.Value);
    }

    public async Task FlushAsync(TradeLikeDbContext db, CancellationToken cancellationToken = default)
    {
        foreach (var item in SnapshotAndReset())
        {
            var stat = await db.ApiUsageStats.FirstOrDefaultAsync(
                existing => existing.TenantId == item.Key.TenantId &&
                    existing.PeriodStartUtc == item.Key.PeriodStartUtc,
                cancellationToken);

            if (stat is null)
            {
                stat = new Models.ApiUsageStat
                {
                    TenantId = item.Key.TenantId,
                    PeriodStartUtc = item.Key.PeriodStartUtc
                };
                await db.ApiUsageStats.AddAsync(stat, cancellationToken);
            }

            stat.Requests += item.Value.Requests;
            stat.ExportCalls += item.Value.ExportCalls;
            stat.AutomationRuns += item.Value.AutomationRuns;
            stat.UpdatedAtUtc = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private void CleanupSecondCounters(long currentSecond)
    {
        foreach (var key in _secondCounters.Keys.Where(key => currentSecond - key.UnixSecond > 10))
        {
            _secondCounters.TryRemove(key, out _);
        }
    }
}

public sealed class UsageCounter
{
    public int Requests;

    public int ExportCalls;

    public int AutomationRuns;
}

public sealed record UsageKey(int TenantId, DateTime PeriodStartUtc);

public sealed record SecondKey(int TenantId, long UnixSecond);

public sealed record UsageCounterSnapshot(int Requests, int ExportCalls, int AutomationRuns)
{
    public bool IsEmpty => Requests == 0 && ExportCalls == 0 && AutomationRuns == 0;
}

public sealed record UsageCheckResult(bool IsAllowed, DateTimeOffset? ResetAtUtc, int RequestsToday, PlanRateLimit Limit)
{
    public static UsageCheckResult Allowed(int requestsToday, PlanRateLimit limit)
    {
        return new UsageCheckResult(true, null, requestsToday, limit);
    }

    public static UsageCheckResult Blocked(DateTimeOffset resetAtUtc)
    {
        return new UsageCheckResult(false, resetAtUtc, 0, PlanRateLimits.ByPlan["Solo"]);
    }
}
