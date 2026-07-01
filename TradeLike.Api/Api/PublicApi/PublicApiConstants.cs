namespace TradeLike.Api.PublicApi;

internal static class PublicApiConstants
{
    public const string ClientRole = "PublicApiClient";

    public static readonly string[] DefaultScopes =
    [
        "customers:read",
        "jobs:read",
        "invoices:read",
        "webhooks:write"
    ];

    public static readonly string[] SupportedWebhookEvents =
    [
        "customer.created",
        "job.created",
        "invoice.created",
        "import.completed",
        "webhook.test"
    ];
}
