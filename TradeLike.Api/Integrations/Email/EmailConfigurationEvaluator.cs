using TradeLike.Api.Configuration;

namespace TradeLike.Api.Integrations.Email;

public sealed record EmailConfigurationEvaluation(
    bool Enabled,
    bool ProviderConfigured,
    string Provider,
    EmailConfigurationState State,
    string Message);

public enum EmailConfigurationState
{
    Disabled,
    Configured,
    Misconfigured
}

public static class EmailConfigurationEvaluator
{
    public static EmailConfigurationEvaluation Evaluate(
        IConfiguration configuration,
        EmailSettings settings)
    {
        var featureEnabled = configuration.GetValue("Features:Email:Enabled", true);
        var provider = string.IsNullOrWhiteSpace(settings.Provider)
            ? EmailSettings.DisabledProvider
            : settings.Provider.Trim();

        if (!featureEnabled || string.Equals(provider, EmailSettings.DisabledProvider, StringComparison.OrdinalIgnoreCase))
        {
            return new EmailConfigurationEvaluation(
                false,
                false,
                provider,
                EmailConfigurationState.Disabled,
                "Email delivery is disabled.");
        }

        var missingKeys = provider switch
        {
            var value when string.Equals(value, EmailSettings.SendGridProvider, StringComparison.OrdinalIgnoreCase) =>
                Missing(settings.SendGrid.ApiKey)
                    ? ["Email:SendGrid:ApiKey"]
                    : [],
            var value when string.Equals(value, EmailSettings.PostmarkProvider, StringComparison.OrdinalIgnoreCase) =>
                Missing(settings.Postmark.ServerToken)
                    ? ["Email:Postmark:ServerToken"]
                    : [],
            var value when string.Equals(value, EmailSettings.ResendProvider, StringComparison.OrdinalIgnoreCase) =>
                Missing(settings.Resend.ApiKey)
                    ? ["Email:Resend:ApiKey"]
                    : [],
            var value when string.Equals(value, EmailSettings.AzureCommunicationServicesProvider, StringComparison.OrdinalIgnoreCase) =>
                new[]
                {
                    Missing(settings.AzureCommunicationServices.ConnectionString)
                        ? "Email:AzureCommunicationServices:ConnectionString"
                        : null,
                    Missing(settings.AzureCommunicationServices.SenderAddress)
                        ? "Email:AzureCommunicationServices:SenderAddress"
                        : null
                }
                .Where(item => item is not null)
                .Cast<string>()
                .ToArray(),
            _ => ["Email:Provider"]
        };

        if (missingKeys.Length > 0)
        {
            var reason = string.Equals(provider, EmailSettings.DisabledProvider, StringComparison.OrdinalIgnoreCase)
                ? "Email provider is disabled."
                : $"Email provider '{provider}' is missing required configuration: {string.Join(", ", missingKeys)}.";

            return new EmailConfigurationEvaluation(
                true,
                false,
                provider,
                EmailConfigurationState.Misconfigured,
                reason);
        }

        return new EmailConfigurationEvaluation(
            true,
            true,
            provider,
            EmailConfigurationState.Configured,
            $"Email provider '{provider}' is configured.");
    }

    private static bool Missing(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ||
            string.Equals(value, JwtSettings.EnvironmentPlaceholder, StringComparison.OrdinalIgnoreCase);
    }
}
