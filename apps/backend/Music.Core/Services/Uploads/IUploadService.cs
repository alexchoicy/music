using Music.Core.Services.Uploads;
using Music.Core.Services.Uploads.Requests;
using Music.Core.Services.Uploads.Results;

namespace Music.Core.Services.Uploads;

public interface IUploadService
{
    Task<MultipartUploadResults> Init(
        CreateUploadRequest createUploadRequest,
        CancellationToken cancellationToken = default
    );

    Task Complete(CompleteUploadRequest request, CancellationToken cancellationToken = default);
}
