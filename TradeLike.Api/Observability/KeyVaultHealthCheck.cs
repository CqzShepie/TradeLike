using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace TradeLike.Api.Observability;

public sealed class KeyVaultHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<KeyVaultHealthCheck> _logger;

    public KeyVaultHealthCheck(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<KeyVaultHealthCheck> logger)
    {
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        if (!OptionalIntegrationHealth.IsEnabled(_configuration, "KeyVault"))
        {
            _logger.LogInformation("Key Vault health check skipped: feature disabled");
            return HealthCheckResult.Healthy("Key Vault health check skipped: feature disabled.");
        }

        var vaultUri = _configuration["AZURE_VAULT_URI"];
        if (string.IsNullOrWhiteSpace(vaultUri))
        {
            if (_environment.IsDevelopment())
            {
                _logger.LogInformation("Key Vault health check skipped: missing config");
                return HealthCheckResult.Healthy("Key Vault health check skipped: missing config.");
            }

            return HealthCheckResult.Unhealthy("AZURE_VAULT_URI is not configured.");
        }

        try
        {
            var client = new SecretClient(new Uri(vaultUri), new DefaultAzureCredential());

            await foreach (var _ in client.GetPropertiesOfSecretsAsync(cancellationToken)
                               .AsPages(pageSizeHint: 1)
                               .WithCancellation(cancellationToken))
            {
                break;
            }

            return HealthCheckResult.Healthy("Key Vault is reachable.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Key Vault check failed.", ex);
        }
    }
}
