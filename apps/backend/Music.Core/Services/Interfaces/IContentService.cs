using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IContentService : IStorageService
{
    public Task<MultipartUploadInfo> CreateMultipartUploadAsync(
        string objectPath,
        string mimeType,
        long fileSizeInBytes,
        CancellationToken cancellationToken = default);

    public Task CompleteAudioMultipartUploadAsync(
        List<CompleteMultipartUploadRequest> requests,
        string userId,
        CancellationToken cancellationToken = default);

    public string GetPlayPresignedUrlAsync(string objectPath, CancellationToken cancellationToken = default);

    public string GetDownloadPresignedUrl(string objectPath, string fileName, CancellationToken cancellationToken = default);

    public string GetUrl(Guid id);

    public Task DownloadFileToTemp(string objectPath, string destinationPath, CancellationToken cancellationToken = default);

    public Task UploadFileFromTempAsync(string objectPath, string sourcePath, CancellationToken cancellationToken = default);
}
