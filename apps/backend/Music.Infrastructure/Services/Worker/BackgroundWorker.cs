using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Music.Core.Models;
using Music.Core.Services.Interfaces;
using Music.Infrastructure.Services.Storage;

namespace Music.Infrastructure.Services.Worker;

public sealed class BackgroundWorker(
    IBackgroundTaskQueue queue,
    ILogger<BackgroundWorker> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            WorkerModel workerModel = await queue.DequeueAudioUploadProcessingAsync(stoppingToken);


            try
            {
                // TODO: run waveform/opus generation here.
                switch (workerModel)
                {
                    case TrackUploadProcessWorkerModel trackUploadWorker:
                        // await ProcessTrackUploadAsync(trackUploadWorker, stoppingToken);

                        break;
                    default:
                        // logger.LogWarning("Unknown worker type {WorkerType} for file object {FileObjectId}.", workerModel.Type, workerModel.FileObjectId);
                        break;
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Storage background processing failed for file object.");
            }
        }
    }
}
