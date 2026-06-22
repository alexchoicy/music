using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Music.Core.Entities;
using Music.Core.Services.Files.Enums;
using Music.Core.Workers;
using Music.Infrastructure.Data;
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
        await queue.RequeueUnfinishedWorkersAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                QueuedWorker queuedWorker = await queue.DequeueWorkerAsync(stoppingToken);

                try
                {
                    using IServiceScope scope = scopeFactory.CreateScope();
                    await ProcessWorkerAsync(
                        queuedWorker.WorkerModel,
                        scope.ServiceProvider,
                        stoppingToken
                    );
                    await queue.CompleteWorkerAsync(queuedWorker.JobId, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    await MarkFileObjectFailedAsync(
                        queuedWorker.WorkerModel,
                        scopeFactory,
                        stoppingToken
                    );
                    await queue.FailWorkerAsync(queuedWorker.JobId, ex.Message, stoppingToken);
                    throw;
                }
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

    private static async Task MarkFileObjectFailedAsync(
        WorkerModel workerModel,
        IServiceScopeFactory scopeFactory,
        CancellationToken cancellationToken
    )
    {
        Guid? fileObjectId = workerModel switch
        {
            TrackUploadProcessWorker job => job.FileObjectId,
            ConcertUploadProcessWorker job => job.FileObjectId,
            ImageUploadProcessWorker job => job.FileObjectId,
            _ => null,
        };

        if (fileObjectId is null)
            return;

        using IServiceScope scope = scopeFactory.CreateScope();
        AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        FileObject? fileObject = await dbContext.FileObjects.FirstOrDefaultAsync(
            fileObject => fileObject.Id == fileObjectId,
            cancellationToken
        );

        if (fileObject is null || fileObject.ProcessingStatus == FileProcessingStatus.Completed)
            return;

        fileObject.ProcessingStatus = FileProcessingStatus.Failed;
        await dbContext.SaveChangesAsync(cancellationToken);
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
            case ConcertUploadProcessWorker job:
                await serviceProvider
                    .GetRequiredService<ConcertUploadWorkerProcessor>()
                    .ProcessAsync(job, cancellationToken);
                break;
            default:
                logger.LogWarning("Unknown worker type {WorkerType}", workerModel.GetType().Name);
                break;
        }
    }
}
