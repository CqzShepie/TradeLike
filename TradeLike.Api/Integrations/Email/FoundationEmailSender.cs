using Microsoft.Extensions.Options;
using TradeLike.Api.Configuration;
using TradeLike.Api.Services.Email;

namespace TradeLike.Api.Integrations.Email;

public sealed class FoundationEmailSender : IEmailSender
{
    private readonly IConfiguration _configuration;
    private readonly EmailSettings _settings;
    private readonly ILogger<FoundationEmailSender> _logger;

    public FoundationEmailSender(
        IConfiguration configuration,
        IOptions<EmailSettings> settings,
        ILogger<FoundationEmailSender> logger)
    {
        _configuration = configuration;
        _settings = settings.Value;
        _logger = logger;
    }

    public Task<EmailSendResult> SendAsync(
        EmailMessage message,
        CancellationToken cancellationToken = default)
    {
        var evaluation = EmailConfigurationEvaluator.Evaluate(_configuration, _settings);

        if (evaluation.State == EmailConfigurationState.Disabled)
        {
            _logger.LogInformation("Email send skipped: {Reason}", evaluation.Message);
            return Task.FromResult(new EmailSendResult(
                EmailSendStatus.SkippedDisabled,
                evaluation.Provider,
                evaluation.Message));
        }

        if (evaluation.State == EmailConfigurationState.Misconfigured)
        {
            _logger.LogWarning("Email send blocked by configuration: {Reason}", evaluation.Message);
            return Task.FromResult(new EmailSendResult(
                EmailSendStatus.FailedMisconfigured,
                evaluation.Provider,
                evaluation.Message));
        }

        _logger.LogWarning(
            "Email provider {Provider} is configured, but delivery wiring is intentionally left for an integration pass. Subject: {Subject}",
            evaluation.Provider,
            message.Subject);

        return Task.FromResult(new EmailSendResult(
            EmailSendStatus.Failed,
            evaluation.Provider,
            "Provider wiring is intentionally left for the next integration pass."));
    }
}
