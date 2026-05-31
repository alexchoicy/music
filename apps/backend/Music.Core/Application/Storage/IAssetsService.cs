namespace Music.Core.Application.Storage;

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
        CancellationToken cancellationToken = default
    );

    string GetUrl(string objectPath);
}
