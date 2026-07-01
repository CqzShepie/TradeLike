namespace TradeLike.Api.Api.Audit;

public static class AuditServiceCollectionExtensions
{
    public static IServiceCollection AddTradeLikeAudit(this IServiceCollection services)
    {
        services.AddScoped<AuditLogService>();
        services.AddHostedService<AuditPurgeJob>();

        return services;
    }
}
