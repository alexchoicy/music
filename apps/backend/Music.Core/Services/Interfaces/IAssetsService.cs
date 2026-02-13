namespace Music.Core.Services.Interfaces;

public interface IAssetsService : IStorageService
{
    public string CreateUploadUrlAsync(
    string objectPath,
    string mimeType,
    string sha1,
    CancellationToken cancellationToken = default);
}
