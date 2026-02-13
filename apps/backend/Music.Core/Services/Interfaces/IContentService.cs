using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IContentService : IStorageService
{
    public Task<MultipartUploadInfo> CreateMultipartUploadAsync(
        string objectPath,
        string mimeType,
        long fileSizeInBytes,
        CancellationToken cancellationToken = default);
}
