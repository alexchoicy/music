using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IBackgroundTaskQueue
{
    void QueueWorkerAsync(WorkerModel workerModel);
    ValueTask<WorkerModel> DequeueWorkerAsync(CancellationToken cancellationToken);
}
