using System.Net.Http.Headers;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace TradeLike.Api.Observability;

public sealed class StripeHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<StripeHealthCheck> _logger;

    public StripeHealthCheck(
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        IWebHostEnvironment environment,
        ILogger<StripeHealthCheck> logger)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _environment = environment;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        if (!OptionalIntegrationHealth.IsEnabled(_configuration, "Stripe"))
        {
            _logger.LogInformation("Stripe health check skipped: feature disabled");
            return HealthCheckResult.Healthy("Stripe health check skipped: feature disabled.");
        }

        var secretKey = _configuration["Stripe:SecretKey"];
        if (string.IsNullOrWhiteSpace(secretKey) ||
            string.Equals(secretKey, "SET_IN_ENVIRONMENT", StringComparison.OrdinalIgnoreCase))
        {
            if (_environment.IsDevelopment())
            {
                _logger.LogInformation("Stripe health check skipped: missing config");
                return HealthCheckResult.Healthy("Stripe health check skipped: missing config.");
            }

            return HealthCheckResult.Unhealthy("Stripe:SecretKey is not configured.");
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.stripe.com/v1/balance");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

            var client = _httpClientFactory.CreateClient();
            using var response = await client.SendAsync(request, cancellationToken);

            return response.IsSuccessStatusCode
                ? HealthCheckResult.Healthy("Stripe API is reachable.")
                : HealthCheckResult.Unhealthy($"Stripe API returned {(int)response.StatusCode}.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Stripe API check failed.", ex);
        }
    }
}
