using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Api.Webhooks;

public sealed class WebhookWorkflowDispatcher : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WebhookWorkflowDispatcher> _logger;

    public WebhookWorkflowDispatcher(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        ILogger<WebhookWorkflowDispatcher> logger)
    {
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DispatchBatchAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Webhook workflow dispatch failed.");
            }

            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        }
    }

    private async Task DispatchBatchAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<TradeLikeDbContext>();
        var httpClient = _httpClientFactory.CreateClient(nameof(WebhookWorkflowDispatcher));

        var deliveries = await context.WebhookWorkflowDeliveries
            .Include(delivery => delivery.WebhookWorkflow)
            .Where(delivery => delivery.Status == "Pending" && delivery.AvailableAtUtc <= DateTime.UtcNow)
            .OrderBy(delivery => delivery.CreatedAtUtc)
            .Take(20)
            .ToListAsync(cancellationToken);

        foreach (var delivery in deliveries)
        {
            await DispatchAsync(context, httpClient, delivery, cancellationToken);
        }
    }

    private static async Task DispatchAsync(
        TradeLikeDbContext context,
        HttpClient httpClient,
        WebhookWorkflowDelivery delivery,
        CancellationToken cancellationToken)
    {
        if (delivery.WebhookWorkflow is null)
        {
            delivery.Status = "Failed";
            delivery.LastError = "Webhook workflow was not found.";
            await context.SaveChangesAsync(cancellationToken);
            return;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, delivery.WebhookWorkflow.TargetUrl);
        request.Content = new StringContent(delivery.PayloadJson, Encoding.UTF8, "application/json");
        request.Headers.Add("X-TL-Event", delivery.EventName);
        request.Headers.Add("X-TL-Delivery", delivery.Id.ToString());
        request.Headers.Add("X-TL-Signature", Sign(delivery.WebhookWorkflow.SignatureSecret, delivery.PayloadJson));

        try
        {
            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                delivery.Status = "Delivered";
                delivery.AttemptCount++;
                delivery.LastAttemptAtUtc = DateTime.UtcNow;
                delivery.LastError = null;
            }
            else
            {
                MarkFailed(delivery, $"HTTP {(int)response.StatusCode}");
            }
        }
        catch (HttpRequestException ex)
        {
            MarkFailed(delivery, ex.Message);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            MarkFailed(delivery, ex.Message);
        }

        await context.SaveChangesAsync(cancellationToken);
    }

    private static void MarkFailed(WebhookWorkflowDelivery delivery, string error)
    {
        delivery.Status = "Pending";
        delivery.AttemptCount++;
        delivery.LastAttemptAtUtc = DateTime.UtcNow;
        delivery.LastError = error;
        delivery.AvailableAtUtc = DateTime.UtcNow.AddSeconds(Math.Min(3600, Math.Pow(2, Math.Min(delivery.AttemptCount, 10)) * 30));
    }

    private static string Sign(string secret, string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }
}
