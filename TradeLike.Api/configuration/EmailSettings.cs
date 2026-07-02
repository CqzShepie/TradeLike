namespace TradeLike.Api.Configuration;

public sealed class EmailSettings
{
    public const string DisabledProvider = "Disabled";
    public const string SendGridProvider = "SendGrid";
    public const string PostmarkProvider = "Postmark";
    public const string ResendProvider = "Resend";
    public const string AzureCommunicationServicesProvider = "AzureCommunicationServices";

    public string Provider { get; set; } = DisabledProvider;

    public string FromName { get; set; } = "TradeLike";

    public string DefaultFromAddress { get; set; } = "noreply@tradelike.co.uk";

    public string DefaultReplyToAddress { get; set; } = "support@tradelike.co.uk";

    public SendGridEmailSettings SendGrid { get; set; } = new();

    public PostmarkEmailSettings Postmark { get; set; } = new();

    public ResendEmailSettings Resend { get; set; } = new();

    public AzureCommunicationServicesEmailSettings AzureCommunicationServices { get; set; } = new();
}

public sealed class SendGridEmailSettings
{
    public string ApiKey { get; set; } = JwtSettings.EnvironmentPlaceholder;
}

public sealed class PostmarkEmailSettings
{
    public string ServerToken { get; set; } = JwtSettings.EnvironmentPlaceholder;
}

public sealed class ResendEmailSettings
{
    public string ApiKey { get; set; } = JwtSettings.EnvironmentPlaceholder;
}

public sealed class AzureCommunicationServicesEmailSettings
{
    public string ConnectionString { get; set; } = JwtSettings.EnvironmentPlaceholder;

    public string SenderAddress { get; set; } = JwtSettings.EnvironmentPlaceholder;
}
