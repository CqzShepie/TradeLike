using TradeLike.Api.Data;

namespace TradeLike.Api.Api.Usage;

public sealed class UsageFlushHostedService : BackgroundService
{
    private static readonly TimeSpan FlushPeriod = TimeSpan.FromSeconds(30);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly UsageCounterStore _store;
    private readonly ILogger<UsageFlushHostedService> _logger;

    public UsageFlushHostedService(
        IServiceScopeFactory scopeFactory,
        UsageCounterStore store,
        ILogger<UsageFlushHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _store = store;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(FlushPeriod);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await FlushAsync(stoppingToken);
        }
    }

    public async Task FlushAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<TradeLikeDbContext>();
            await _store.FlushAsync(db, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Usage counter flush failed.");
        }
    }
}
