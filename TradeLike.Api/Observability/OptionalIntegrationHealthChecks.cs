using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace TradeLike.Api.Observability;

internal static class OptionalIntegrationHealth
{
    public static bool IsEnabled(IConfiguration configuration, string feature)
    {
        return configuration.GetValue($"Features:{feature}:Enabled", true);
    }

    public static bool IsMissing(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ||
            string.Equals(value, "SET_IN_ENVIRONMENT", StringComparison.OrdinalIgnoreCase);
    }
}

public sealed class ElasticSearchHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<ElasticSearchHealthCheck> _logger;

    public ElasticSearchHealthCheck(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<ElasticSearchHealthCheck> logger)
    {
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        if (!OptionalIntegrationHealth.IsEnabled(_configuration, "ElasticSearch"))
        {
            _logger.LogInformation("Elasticsearch health check skipped: feature disabled");
            return Task.FromResult(HealthCheckResult.Healthy("Elasticsearch health check skipped: feature disabled."));
        }

        if (OptionalIntegrationHealth.IsMissing(_configuration["ELASTIC_URI"]) ||
            OptionalIntegrationHealth.IsMissing(_configuration["ELASTIC_API_KEY"]))
        {
            if (_environment.IsDevelopment())
            {
                _logger.LogInformation("Elasticsearch health check skipped: missing config");
                return Task.FromResult(HealthCheckResult.Healthy("Elasticsearch health check skipped: missing config."));
            }

            return Task.FromResult(HealthCheckResult.Unhealthy("Elasticsearch configuration is missing."));
        }

        return Task.FromResult(HealthCheckResult.Healthy("Elasticsearch is configured."));
    }
}

public sealed class ServiceBusHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<ServiceBusHealthCheck> _logger;

    public ServiceBusHealthCheck(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<ServiceBusHealthCheck> logger)
    {
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        return NotificationIntegrationHealth.CheckConfig(
            "Service Bus",
            "service_bus",
            _configuration["SERVICEBUS_CONNECTION_STRING"] ??
                _configuration["AZURE_SERVICEBUS_CONNECTION_STRING"] ??
                _configuration["AzureServiceBus:ConnectionString"],
            _configuration,
            _environment,
            _logger);
    }
}

public sealed class SendGridHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<SendGridHealthCheck> _logger;

    public SendGridHealthCheck(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<SendGridHealthCheck> logger)
    {
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        return NotificationIntegrationHealth.CheckConfig(
            "SendGrid",
            "sendgrid",
            _configuration["SENDGRID_API_KEY"] ?? _configuration["SendGrid:ApiKey"],
            _configuration,
            _environment,
            _logger);
    }
}

public sealed class TwilioHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<TwilioHealthCheck> _logger;

    public TwilioHealthCheck(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<TwilioHealthCheck> logger)
    {
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var accountSid = _configuration["TWILIO_ACCOUNT_SID"] ?? _configuration["Twilio:AccountSid"];
        var authToken = _configuration["TWILIO_AUTH_TOKEN"] ?? _configuration["Twilio:AuthToken"];
        var configured = !OptionalIntegrationHealth.IsMissing(accountSid) &&
            !OptionalIntegrationHealth.IsMissing(authToken);

        return NotificationIntegrationHealth.CheckConfig(
            "Twilio",
            "twilio",
            configured ? "configured" : null,
            _configuration,
            _environment,
            _logger);
    }
}

public sealed class ExternalServicesHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<ExternalServicesHealthCheck> _logger;

    public ExternalServicesHealthCheck(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<ExternalServicesHealthCheck> logger)
    {
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var googleMaps = _configuration["GOOGLE_MAPS_KEY"];
        if (OptionalIntegrationHealth.IsMissing(googleMaps))
        {
            if (_environment.IsDevelopment())
            {
                _logger.LogInformation("External services health check skipped: missing config");
                return Task.FromResult(HealthCheckResult.Healthy("External services health check skipped: missing config."));
            }

            return Task.FromResult(HealthCheckResult.Unhealthy("External service configuration is missing."));
        }

        return Task.FromResult(HealthCheckResult.Healthy("External services are configured."));
    }
}

internal static class NotificationIntegrationHealth
{
    public static Task<HealthCheckResult> CheckConfig<TLogger>(
        string displayName,
        string checkName,
        string? value,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<TLogger> logger)
    {
        if (!OptionalIntegrationHealth.IsEnabled(configuration, "Notifications"))
        {
            logger.LogInformation("{DisplayName} health check skipped: feature disabled", displayName);
            return Task.FromResult(HealthCheckResult.Healthy($"{displayName} health check skipped: feature disabled."));
        }

        if (OptionalIntegrationHealth.IsMissing(value))
        {
            if (environment.IsDevelopment())
            {
                logger.LogInformation("{DisplayName} health check skipped: missing config", displayName);
                return Task.FromResult(HealthCheckResult.Healthy($"{displayName} health check skipped: missing config."));
            }

            return Task.FromResult(HealthCheckResult.Unhealthy($"{checkName} configuration is missing."));
        }

        return Task.FromResult(HealthCheckResult.Healthy($"{displayName} is configured."));
    }
}
