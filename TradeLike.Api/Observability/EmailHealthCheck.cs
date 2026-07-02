using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using TradeLike.Api.Configuration;
using TradeLike.Api.Integrations.Email;

namespace TradeLike.Api.Observability;

public sealed class EmailHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;
    private readonly EmailSettings _settings;

    public EmailHealthCheck(
        IConfiguration configuration,
        IOptions<EmailSettings> settings)
    {
        _configuration = configuration;
        _settings = settings.Value;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var evaluation = EmailConfigurationEvaluator.Evaluate(_configuration, _settings);

        return Task.FromResult(evaluation.State switch
        {
            EmailConfigurationState.Disabled => HealthCheckResult.Healthy(evaluation.Message),
            EmailConfigurationState.Configured => HealthCheckResult.Healthy(evaluation.Message),
            _ => HealthCheckResult.Unhealthy(evaluation.Message)
        });
    }
}
