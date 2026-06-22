namespace Music.Core.Workers;

public sealed record QueuedWorker(Guid JobId, WorkerModel WorkerModel);

public interface IBackgroundTaskQueue
{
    ValueTask QueueWorkerAsync(
        WorkerModel workerModel,
        CancellationToken cancellationToken = default
    );

    ValueTask<QueuedWorker> DequeueWorkerAsync(CancellationToken cancellationToken);

    Task RequeueUnfinishedWorkersAsync(CancellationToken cancellationToken = default);

    Task RetryWorkerAsync(Guid jobId, CancellationToken cancellationToken = default);

    Task CompleteWorkerAsync(Guid jobId, CancellationToken cancellationToken = default);

    Task FailWorkerAsync(
        Guid jobId,
        string errorMessage,
        CancellationToken cancellationToken = default
    );
}
