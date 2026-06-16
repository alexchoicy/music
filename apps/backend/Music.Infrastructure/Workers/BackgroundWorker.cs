using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Music.Core.Workers;
using Music.Infrastructure.Workers.Processor;

namespace Music.Infrastructure.Workers;

public sealed class BackgroundWorker(
    IBackgroundTaskQueue queue,
    IServiceScopeFactory scopeFactory,
    ILogger<BackgroundWorker> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                WorkerModel workerModel = await queue.DequeueWorkerAsync(stoppingToken);

                using IServiceScope scope = scopeFactory.CreateScope();
                await ProcessWorkerAsync(workerModel, scope.ServiceProvider, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Worker background processing failed.");
            }
        }
    }

    private async Task ProcessWorkerAsync(
        WorkerModel workerModel,
        IServiceProvider serviceProvider,
        CancellationToken cancellationToken
    )
    {
        switch (workerModel)
        {
            case ImageUploadProcessWorker job:
                await serviceProvider
                    .GetRequiredService<ImageUploadWorkerProcessor>()
                    .ProcessAsync(job, cancellationToken);
                break;
            case TrackUploadProcessWorker job:
                await serviceProvider
                    .GetRequiredService<TrackUploadWorkerProcessor>()
                    .ProcessAsync(job, cancellationToken);
                break;
            case PartyInfoEnrichmentWorker job:
                await serviceProvider
                    .GetRequiredService<PartyInfoEnrichmentWorkerProcessor>()
                    .ProcessAsync(job, cancellationToken);
                break;
            // case ConcertUploadProcessWorker job:
            //     await serviceProvider
            //         .GetRequiredService<ConcertUploadWorkerProcessor>()
            //         .ProcessAsync(job, cancellationToken);
            //     break;
            default:
                logger.LogWarning("Unknown worker type {WorkerType}", workerModel.GetType().Name);
                break;
        }
    }
}
