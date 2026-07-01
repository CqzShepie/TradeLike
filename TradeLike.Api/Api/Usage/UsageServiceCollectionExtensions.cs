namespace TradeLike.Api.Api.Usage;

public static class UsageServiceCollectionExtensions
{
    public static IServiceCollection AddTradeLikeUsageTracking(this IServiceCollection services)
    {
        services.AddSingleton<UsageCounterStore>();
        services.AddHostedService<UsageFlushHostedService>();

        return services;
    }
}
