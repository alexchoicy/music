using Music.Core.Domain.Uploads;

namespace Music.Core.Domain.Files;

public interface IFileUrlService
{
    Task<string> GetFilePlayUrlAsync(
        Guid fileObjectId,
        CancellationToken cancellationToken = default
    );
    Task<MultipartUploadResults> InitUploadAsync(
        Guid fileObjectId,
        CancellationToken cancellationToken = default
    );
    Task<string> GetDashManifestAsync(
        Guid fileObjectId,
        CancellationToken cancellationToken = default
    );
}
