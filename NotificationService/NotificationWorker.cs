using Azure.Messaging.ServiceBus;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace NotificationService;

public sealed class NotificationWorker : BackgroundService
{
    public const string EmailQueueName = "notifications-email";
    public const string SmsQueueName = "notifications-sms";

    private readonly ServiceBusClient _serviceBusClient;
    private readonly NotificationDispatcher _dispatcher;
    private readonly ILogger<NotificationWorker> _logger;

    public NotificationWorker(
        ServiceBusClient serviceBusClient,
        NotificationDispatcher dispatcher,
        ILogger<NotificationWorker> logger)
    {
        _serviceBusClient = serviceBusClient;
        _dispatcher = dispatcher;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var processors = new[]
        {
            CreateProcessor(EmailQueueName),
            CreateProcessor(SmsQueueName)
        };

        try
        {
            foreach (var processor in processors)
            {
                await processor.StartProcessingAsync(stoppingToken);
                _logger.LogInformation("Notification processor started for queue {QueueName}.", processor.EntityPath);
            }

            await Task.Delay(Timeout.InfiniteTimeSpan, stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
        finally
        {
            foreach (var processor in processors)
            {
                await processor.StopProcessingAsync(CancellationToken.None);
                await processor.DisposeAsync();
            }
        }
    }

    private ServiceBusProcessor CreateProcessor(string queueName)
    {
        var processor = _serviceBusClient.CreateProcessor(queueName, new ServiceBusProcessorOptions
        {
            AutoCompleteMessages = false,
            MaxConcurrentCalls = 4,
            PrefetchCount = 10
        });

        processor.ProcessMessageAsync += args => ProcessMessageAsync(queueName, args);
        processor.ProcessErrorAsync += ProcessErrorAsync;

        return processor;
    }

    private async Task ProcessMessageAsync(
        string queueName,
        ProcessMessageEventArgs args)
    {
        try
        {
            var message = args.Message.Body.ToObjectFromJson<NotificationMessage>();
            if (message is null)
            {
                await args.DeadLetterMessageAsync(args.Message, "InvalidPayload", "Notification message body is empty.");
                return;
            }

            await _dispatcher.DispatchAsync(queueName, message, args.CancellationToken);
            await args.CompleteMessageAsync(args.Message, args.CancellationToken);

            _logger.LogInformation(
                "Notification {MessageId} completed from {QueueName}.",
                message.MessageId,
                queueName);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Notification message was rejected from {QueueName}.", queueName);
            await args.DeadLetterMessageAsync(args.Message, "ValidationFailed", ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Notification message failed from {QueueName}.", queueName);
            await args.AbandonMessageAsync(args.Message, cancellationToken: args.CancellationToken);
        }
    }

    private Task ProcessErrorAsync(ProcessErrorEventArgs args)
    {
        _logger.LogError(
            args.Exception,
            "Service Bus error from {EntityPath} during {ErrorSource}.",
            args.EntityPath,
            args.ErrorSource);

        return Task.CompletedTask;
    }
}
