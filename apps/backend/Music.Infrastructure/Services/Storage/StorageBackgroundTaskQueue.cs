using System.Threading.Channels;

namespace Music.Infrastructure.Services.Storage;

public interface IStorageBackgroundTaskQueue
{
    void QueueAudioUploadProcessing(Guid fileObjectId);
    ValueTask<Guid> DequeueAudioUploadProcessingAsync(CancellationToken cancellationToken);
}

public sealed class StorageBackgroundTaskQueue : IStorageBackgroundTaskQueue
{
    private readonly Channel<Guid> _queue = Channel.CreateUnbounded<Guid>();

    public void QueueAudioUploadProcessing(Guid fileObjectId)
    {
        if (!_queue.Writer.TryWrite(fileObjectId))
        {
            throw new InvalidOperationException("Unable to queue storage background task.");
        }
    }

    public ValueTask<Guid> DequeueAudioUploadProcessingAsync(CancellationToken cancellationToken)
    {
        return _queue.Reader.ReadAsync(cancellationToken);
    }
}
