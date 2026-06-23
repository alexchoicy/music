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

    Task<IReadOnlyList<PendingOriginalFileResult>> GetPendingOriginalFiles(
        string userID,
        CancellationToken cancellationToken = default
    );

    Task<StartUploadResult> Start(
        Guid fileObjectID,
        string userID,
        CancellationToken cancellationToken = default
    );

    Task Complete(
        CompleteUploadRequest request,
        string userID,
        CancellationToken cancellationToken = default
    );
}
