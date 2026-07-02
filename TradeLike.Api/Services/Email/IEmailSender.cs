namespace TradeLike.Api.Services.Email;

public interface IEmailSender
{
    Task<EmailSendResult> SendAsync(
        EmailMessage message,
        CancellationToken cancellationToken = default);
}
