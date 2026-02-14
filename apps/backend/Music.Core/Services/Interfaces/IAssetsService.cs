namespace Music.Core.Services.Interfaces;

public interface IAssetsService : IStorageService
{
    public string CreateUploadUrlAsync(
    string objectPath,
    string mimeType,
    CancellationToken cancellationToken = default);

    public string GetUrl(string objectPath, CancellationToken cancellationToken = default);
}
