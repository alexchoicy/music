using Music.Core.Services.Uploads;
using Music.Core.Services.Uploads.Requests;
using Music.Core.Services.Uploads.Results;

namespace Music.Core.Storage;

public interface IContentService : IStorageService
{
    Task<MultipartUploadResults> CreateMultipartUploadAsync(
        string objectPath,
        string mimeType,
        long fileSizeInBytes,
        CancellationToken cancellationToken = default
    );

    Task CompleteMultipartUploadAsync(
        string objectPath,
        string uploadId,
        IReadOnlyList<CompleteMultipartUploadPart> parts,
        CancellationToken cancellationToken = default
    );

    string GetPresignedUrl(
        string objectPath,
        DateTime expires,
        string? downloadFileName = null,
        CancellationToken cancellationToken = default
    );

    string GetUrl(Guid id);

    Task DownloadFileToTemp(
        string objectPath,
        string destinationPath,
        CancellationToken cancellationToken = default
    );

    Task UploadFileFromTempAsync(
        string objectPath,
        string sourcePath,
        string? mimeType = null,
        CancellationToken cancellationToken = default
    );

    Task<string> ReadTextAsync(string objectPath, CancellationToken cancellationToken = default);
}
