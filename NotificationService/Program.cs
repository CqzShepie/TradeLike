using Azure.Messaging.ServiceBus;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using NotificationService;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddHttpClient(NotificationDispatcher.HttpClientName);
builder.Services.AddSingleton(sp =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var connectionString =
        configuration["SERVICEBUS_CONNECTION_STRING"] ??
        configuration["AZURE_SERVICEBUS_CONNECTION_STRING"] ??
        configuration["AzureServiceBus:ConnectionString"];

    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException(
            "SERVICEBUS_CONNECTION_STRING or AZURE_SERVICEBUS_CONNECTION_STRING must be configured.");
    }

    return new ServiceBusClient(connectionString);
});
builder.Services.AddSingleton<NotificationDispatcher>();
builder.Services.AddHostedService<NotificationWorker>();

await builder.Build().RunAsync();
