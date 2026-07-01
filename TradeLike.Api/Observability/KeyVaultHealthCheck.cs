using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace TradeLike.Api.Observability;

public sealed class KeyVaultHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;

    public KeyVaultHealthCheck(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var vaultUri = _configuration["AZURE_VAULT_URI"];
        if (string.IsNullOrWhiteSpace(vaultUri))
        {
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
