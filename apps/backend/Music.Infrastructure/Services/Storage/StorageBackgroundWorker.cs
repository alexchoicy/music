using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Music.Infrastructure.Services.Storage;

public sealed class StorageBackgroundWorker(
    IStorageBackgroundTaskQueue queue,
    ILogger<StorageBackgroundWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            Guid fileObjectId = await queue.DequeueAudioUploadProcessingAsync(stoppingToken);

            try
            {
                logger.LogInformation("Processing queued storage job for file object {FileObjectId}.", fileObjectId);
                // TODO: run waveform/opus generation here.
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Storage background processing failed for file object {FileObjectId}.", fileObjectId);
            }
        }
    }
}
