using Microsoft.Extensions.Options;
using TradeLike.Api.Configuration;

namespace TradeLike.Api.Services.Email;

public sealed class DisabledEmailSender : IEmailSender
{
    private readonly EmailSettings _settings;

    public DisabledEmailSender(IOptions<EmailSettings> settings)
    {
        _settings = settings.Value;
    }

    public Task<EmailSendResult> SendAsync(
        EmailMessage message,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new EmailSendResult(
            EmailSendStatus.SkippedDisabled,
            string.IsNullOrWhiteSpace(_settings.Provider) ? EmailSettings.DisabledProvider : _settings.Provider,
            "Email delivery skipped because the feature or provider is disabled."));
    }
}
