using System.Threading.Channels;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Infrastructure.Services.Worker;

public sealed class BackgroundTaskQueue : IBackgroundTaskQueue
{
    private readonly Channel<WorkerModel> _queue;

    public BackgroundTaskQueue(int capacity = 1000)
    {
        var options = new BoundedChannelOptions(capacity)
        {
            SingleReader = true,
            SingleWriter = false,
            FullMode = BoundedChannelFullMode.Wait
        };

        _queue = Channel.CreateBounded<WorkerModel>(options);
    }

    public void QueueAudioUploadProcessing(WorkerModel workerModel)
    {
        if (!_queue.Writer.TryWrite(workerModel))
        {
            throw new InvalidOperationException("Unable to queue storage background task.");
        }
    }

    public ValueTask<WorkerModel> DequeueAudioUploadProcessingAsync(CancellationToken cancellationToken)
    {
        return _queue.Reader.ReadAsync(cancellationToken);
    }
}
