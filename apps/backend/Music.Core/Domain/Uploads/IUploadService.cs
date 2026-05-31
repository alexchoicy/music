using Music.Core.Domain.Uploads.Requests;

namespace Music.Core.Domain.Uploads;

public interface IUploadService
{
    Task<MultipartUploadResults> Init(
        CreateUploadRequest createUploadRequest,
        CancellationToken cancellationToken = default
    );

    Task Complete(
        CompleteUploadRequest request,
        CancellationToken cancellationToken = default
    );
}
