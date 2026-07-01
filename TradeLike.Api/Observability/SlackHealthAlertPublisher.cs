using System.Net.Http.Json;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace TradeLike.Api.Observability;

public sealed class SlackHealthAlertPublisher : IHealthCheckPublisher
{
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SlackHealthAlertPublisher> _logger;
    private DateTimeOffset _lastAlertAt = DateTimeOffset.MinValue;

    public SlackHealthAlertPublisher(
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<SlackHealthAlertPublisher> logger)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task PublishAsync(HealthReport report, CancellationToken cancellationToken)
    {
        if (report.Status != HealthStatus.Unhealthy)
        {
            return;
        }

        var webhookUrl = _configuration["SLACK_WEBHOOK_URL"];
        if (string.IsNullOrWhiteSpace(webhookUrl))
        {
            return;
        }

        if (DateTimeOffset.UtcNow - _lastAlertAt < TimeSpan.FromMinutes(5))
        {
            return;
        }

        _lastAlertAt = DateTimeOffset.UtcNow;

        try
        {
            var failedChecks = report.Entries
                .Where(entry => entry.Value.Status == HealthStatus.Unhealthy)
                .Select(entry => $"{entry.Key}: {entry.Value.Exception?.Message ?? entry.Value.Description}")
                .ToArray();

            var client = _httpClientFactory.CreateClient();
            await client.PostAsJsonAsync(webhookUrl, new
            {
                text = $"TradeLike health check is unhealthy: {string.Join("; ", failedChecks)}"
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish Slack health alert.");
        }
    }
}
