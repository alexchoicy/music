using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IContentService : IStorageService
{
    public Task<MultipartUploadInfo> CreateMultipartUploadAsync(
        string objectPath,
        string mimeType,
        long fileSizeInBytes,
        CancellationToken cancellationToken = default);

    public Task CompleteMultipartUploadAsync(List<CompleteMultipartUploadRequest> requests, CancellationToken cancellationToken = default);

    public string GetPlayPresignedUrlAsync(string objectPath, CancellationToken cancellationToken = default);

    public string GetUrl(Guid id);
}
