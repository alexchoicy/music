using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IBackgroundTaskQueue
{
    void QueueAudioUploadProcessing(WorkerModel workerModel);
    ValueTask<WorkerModel> DequeueAudioUploadProcessingAsync(CancellationToken cancellationToken);
}
