using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IFileUrlService
{
    Task<string> GetFileUrlAsync(Guid fileObjectId, CancellationToken cancellationToken = default);
    Task<string> GetFilePlayUrlAsync(Guid fileObjectId, CancellationToken cancellationToken = default);
    Task<MultipartUploadInfo> InitUploadAsync(Guid fileObjectId, CancellationToken cancellationToken = default);
}
