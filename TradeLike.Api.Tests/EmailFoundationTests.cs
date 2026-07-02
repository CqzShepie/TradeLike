using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using TradeLike.Api.Configuration;
using TradeLike.Api.Integrations.Email;
using TradeLike.Api.Observability;
using TradeLike.Api.Services.Email;
using Xunit;

namespace TradeLike.Api.Tests;

public sealed class EmailFoundationTests
{
    [Fact]
    public void DefaultSenderIsNoReply()
    {
        var service = CreateTemplateService();

        Assert.Equal("TradeLike", service.SystemFrom.DisplayName);
        Assert.Equal("noreply@tradelike.co.uk", service.SystemFrom.Address);
    }

    [Fact]
    public void DefaultReplyToIsSupport()
    {
        var service = CreateTemplateService();

        Assert.Equal("support@tradelike.co.uk", service.DefaultReplyTo.Address);
    }

    [Fact]
    public void PasswordResetTemplateUsesNoReplyAndSupport()
    {
        var service = CreateTemplateService();

        var message = service.BuildPasswordResetEmail(
            "user@example.com",
            "https://app.tradelike.co.uk/reset-password?token=abc",
            new DateTime(2026, 7, 2, 12, 0, 0, DateTimeKind.Utc));

        Assert.Equal("noreply@tradelike.co.uk", message.From.Address);
        Assert.Equal("support@tradelike.co.uk", message.ReplyTo?.Address);
        Assert.Equal("Reset your TradeLike password", message.Subject);
    }

    [Fact]
    public void QuoteTemplateUsesTenantReplyToWhenProvided()
    {
        var service = CreateTemplateService();

        var message = service.BuildQuoteEmail(
            "customer@example.com",
            "Your quote from TradeLike",
            "Quote body",
            "quotes@tenant.co.uk");

        Assert.Equal("quotes@tenant.co.uk", message.ReplyTo?.Address);
    }

    [Fact]
    public void InvoiceTemplateFallsBackToSupportReplyTo()
    {
        var service = CreateTemplateService();

        var message = service.BuildInvoiceEmail(
            "customer@example.com",
            "Your invoice from TradeLike",
            "Invoice body");

        Assert.Equal("support@tradelike.co.uk", message.ReplyTo?.Address);
    }

    [Fact]
    public void ContactSalesRoutesToSalesInbox()
    {
        var service = CreateTemplateService();

        var message = service.BuildSalesContactEmail(
            "submitter@example.com",
            "New sales enquiry",
            "Body");

        Assert.Equal("sales@tradelike.co.uk", message.To.Single().Address);
        Assert.Equal("submitter@example.com", message.ReplyTo?.Address);
    }

    [Fact]
    public void SupportFormRoutesToSupportInbox()
    {
        var service = CreateTemplateService();

        var message = service.BuildSupportContactEmail(
            "submitter@example.com",
            "Need help",
            "Body");

        Assert.Equal("support@tradelike.co.uk", message.To.Single().Address);
    }

    [Fact]
    public void GeneralContactRoutesToHelloInbox()
    {
        var service = CreateTemplateService();

        var message = service.BuildGeneralContactEmail(
            "submitter@example.com",
            "Hello",
            "Body");

        Assert.Equal("hello@tradelike.co.uk", message.To.Single().Address);
    }

    [Fact]
    public async Task DisabledSenderReturnsSkippedDisabled()
    {
        var sender = new DisabledEmailSender(Options.Create(new EmailSettings()));
        var message = CreateTemplateService().BuildVerificationEmail(
            "user@example.com",
            "https://app.tradelike.co.uk/verify");

        var result = await sender.SendAsync(message);

        Assert.Equal(EmailSendStatus.SkippedDisabled, result.Status);
    }

    [Fact]
    public async Task MissingProviderConfigurationReturnsFailedMisconfigured()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Features:Email:Enabled"] = "true"
            })
            .Build();

        var sender = new FoundationEmailSender(
            configuration,
            Options.Create(new EmailSettings
            {
                Provider = EmailSettings.SendGridProvider
            }),
            NullLogger<FoundationEmailSender>.Instance);

        var result = await sender.SendAsync(CreateTemplateService().BuildVerificationEmail(
            "user@example.com",
            "https://app.tradelike.co.uk/verify"));

        Assert.Equal(EmailSendStatus.FailedMisconfigured, result.Status);
    }

    [Fact]
    public async Task MissingProviderConfigurationMarksHealthCheckUnhealthy()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Features:Email:Enabled"] = "true"
            })
            .Build();

        var healthCheck = new EmailHealthCheck(
            configuration,
            Options.Create(new EmailSettings
            {
                Provider = EmailSettings.ResendProvider
            }));

        var result = await healthCheck.CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Unhealthy, result.Status);
    }

    private static EmailTemplateService CreateTemplateService()
    {
        return new EmailTemplateService(
            Options.Create(new EmailSettings
            {
                Provider = EmailSettings.DisabledProvider,
                FromName = "TradeLike",
                DefaultFromAddress = "noreply@tradelike.co.uk",
                DefaultReplyToAddress = "support@tradelike.co.uk"
            }),
            Options.Create(new TradeLikeEmailAddresses
            {
                Sales = "sales@tradelike.co.uk",
                Support = "support@tradelike.co.uk",
                Hello = "hello@tradelike.co.uk",
                NoReply = "noreply@tradelike.co.uk"
            }));
    }
}
