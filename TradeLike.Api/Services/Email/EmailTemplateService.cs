using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Options;
using TradeLike.Api.Configuration;

namespace TradeLike.Api.Services.Email;

public sealed class EmailTemplateService
{
    private readonly EmailSettings _settings;
    private readonly TradeLikeEmailAddresses _officialAddresses;

    public EmailTemplateService(
        IOptions<EmailSettings> settings,
        IOptions<TradeLikeEmailAddresses> officialAddresses)
    {
        _settings = settings.Value;
        _officialAddresses = officialAddresses.Value;
    }

    public EmailAddress SystemFrom => new(
        NormalizeAddress(_settings.DefaultFromAddress, _officialAddresses.NoReply),
        string.IsNullOrWhiteSpace(_settings.FromName) ? "TradeLike" : _settings.FromName.Trim());

    public EmailAddress DefaultReplyTo => new(
        NormalizeAddress(_settings.DefaultReplyToAddress, _officialAddresses.Support));

    public EmailMessage BuildPasswordResetEmail(string to, string resetLink, DateTime expiresAtUtc)
    {
        return BuildSystemEmail(
            to,
            "Reset your TradeLike password",
            string.Join(
                "\n\n",
                "We received a request to reset your TradeLike password.",
                $"Use this secure link before {expiresAtUtc:u}: {resetLink}",
                "If you did not request this, you can ignore this email.",
                $"Need help? Contact {DefaultReplyTo.Address}."),
            "password-reset");
    }

    public EmailMessage BuildVerificationEmail(string to, string verificationLink)
    {
        return BuildSystemEmail(
            to,
            "Verify your TradeLike email address",
            string.Join(
                "\n\n",
                "Verify your email address to finish setting up TradeLike.",
                verificationLink,
                $"Need help? Contact {DefaultReplyTo.Address}."),
            "verification");
    }

    public EmailMessage BuildInviteEmail(string to, string inviteLink, string inviteType)
    {
        return BuildSystemEmail(
            to,
            $"Your TradeLike {inviteType} invite",
            string.Join(
                "\n\n",
                $"You've been invited to TradeLike as part of a {inviteType}.",
                inviteLink,
                $"Need help? Contact {DefaultReplyTo.Address}."),
            "invite");
    }

    public EmailMessage BuildQuoteEmail(string to, string subject, string body, string? tenantReplyTo = null)
    {
        return BuildBusinessReplyEmail(to, subject, body, tenantReplyTo, "quote");
    }

    public EmailMessage BuildInvoiceEmail(string to, string subject, string body, string? tenantReplyTo = null)
    {
        return BuildBusinessReplyEmail(to, subject, body, tenantReplyTo, "invoice");
    }

    public EmailMessage BuildSalesContactEmail(string submitterEmail, string subject, string body)
    {
        return new EmailMessage(
            SystemFrom,
            [new EmailAddress(NormalizeAddress(_officialAddresses.Sales, "sales@tradelike.co.uk"))],
            subject,
            body,
            new EmailAddress(NormalizeAddress(submitterEmail, DefaultReplyTo.Address)),
            TemplateKey: "contact-sales");
    }

    public EmailMessage BuildSupportContactEmail(string submitterEmail, string subject, string body)
    {
        return new EmailMessage(
            SystemFrom,
            [new EmailAddress(NormalizeAddress(_officialAddresses.Support, "support@tradelike.co.uk"))],
            subject,
            body,
            new EmailAddress(NormalizeAddress(submitterEmail, DefaultReplyTo.Address)),
            TemplateKey: "contact-support");
    }

    public EmailMessage BuildGeneralContactEmail(string submitterEmail, string subject, string body)
    {
        return new EmailMessage(
            SystemFrom,
            [new EmailAddress(NormalizeAddress(_officialAddresses.Hello, "hello@tradelike.co.uk"))],
            subject,
            body,
            new EmailAddress(NormalizeAddress(submitterEmail, DefaultReplyTo.Address)),
            TemplateKey: "contact-general");
    }

    private EmailMessage BuildSystemEmail(
        string to,
        string subject,
        string body,
        string templateKey)
    {
        return new EmailMessage(
            SystemFrom,
            [new EmailAddress(NormalizeAddress(to, string.Empty))],
            subject,
            body,
            DefaultReplyTo,
            TemplateKey: templateKey);
    }

    private EmailMessage BuildBusinessReplyEmail(
        string to,
        string subject,
        string body,
        string? tenantReplyTo,
        string templateKey)
    {
        var replyTo = NormalizeOptionalAddress(tenantReplyTo) ?? DefaultReplyTo.Address;

        return new EmailMessage(
            SystemFrom,
            [new EmailAddress(NormalizeAddress(to, string.Empty))],
            subject,
            body,
            new EmailAddress(replyTo),
            TemplateKey: templateKey);
    }

    private static string NormalizeAddress(string? candidate, string fallback)
    {
        var trimmed = candidate?.Trim();
        if (!string.IsNullOrWhiteSpace(trimmed) && new EmailAddressAttribute().IsValid(trimmed))
        {
            return trimmed;
        }

        if (!string.IsNullOrWhiteSpace(fallback))
        {
            return fallback;
        }

        throw new InvalidOperationException("A valid email address is required.");
    }

    private static string? NormalizeOptionalAddress(string? candidate)
    {
        var trimmed = candidate?.Trim();
        return !string.IsNullOrWhiteSpace(trimmed) && new EmailAddressAttribute().IsValid(trimmed)
            ? trimmed
            : null;
    }
}
