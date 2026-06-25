namespace Music.Core.Storage;

public interface IAssetsService : IStorageService
{
    string CreateUploadUrlAsync(
        string objectPath,
        string mimeType,
        CancellationToken cancellationToken = default
    );

    Task UploadFileFromTempAsync(
        string objectPath,
        string sourcePath,
        string? mimeType = null,
        CancellationToken cancellationToken = default
    );

    string GetUrl(string objectPath);

    Task DownloadFileToTempAsync(
        string objectPath,
        string destinationPath,
        CancellationToken cancellationToken = default
    );

    Task DeleteFileAsync(string objectPath, CancellationToken cancellationToken = default);
}
