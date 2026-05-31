namespace Music.Core.Workers;

public interface IBackgroundTaskQueue
{
    ValueTask QueueWorkerAsync(
        WorkerModel workerModel,
        CancellationToken cancellationToken = default
    );

    ValueTask<WorkerModel> DequeueWorkerAsync(CancellationToken cancellationToken);
}
