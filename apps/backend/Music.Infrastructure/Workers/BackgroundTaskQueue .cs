using System.Threading.Channels;
using Music.Core.Workers;

namespace Music.Infrastructure.Workers;

public sealed class BackgroundTaskQueue : IBackgroundTaskQueue
{
    private readonly Channel<WorkerModel> _queue;

    public BackgroundTaskQueue(int capacity = 1000)
    {
        BoundedChannelOptions options = new(capacity)
        {
            SingleReader = true,
            SingleWriter = false,
            FullMode = BoundedChannelFullMode.Wait,
        };

        _queue = Channel.CreateBounded<WorkerModel>(options);
    }

    public ValueTask QueueWorkerAsync(
        WorkerModel workerModel,
        CancellationToken cancellationToken = default
    )
    {
        return _queue.Writer.WriteAsync(workerModel, cancellationToken);
    }

    public ValueTask<WorkerModel> DequeueWorkerAsync(CancellationToken cancellationToken)
    {
        return _queue.Reader.ReadAsync(cancellationToken);
    }
}
