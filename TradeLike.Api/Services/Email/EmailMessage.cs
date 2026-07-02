namespace TradeLike.Api.Services.Email;

public sealed record EmailMessage(
    EmailAddress From,
    IReadOnlyList<EmailAddress> To,
    string Subject,
    string TextBody,
    EmailAddress? ReplyTo = null,
    string? HtmlBody = null,
    string? TemplateKey = null,
    IReadOnlyList<EmailAttachment>? Attachments = null);
