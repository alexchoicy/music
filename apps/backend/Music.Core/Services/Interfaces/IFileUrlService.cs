using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IFileUrlService
{
    Task<string> GetFilePlayUrlAsync(Guid fileObjectId, CancellationToken cancellationToken = default);
    Task<MultipartUploadInfo> InitUploadAsync(Guid fileObjectId, CancellationToken cancellationToken = default);

    Task<string> GetDashManifestAsync(Guid fileObjectId, CancellationToken cancellationToken = default);
}
