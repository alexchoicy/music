namespace Music.Core.Services.Interfaces;

public interface IAssetsService : IStorageService
{
    public Task<string> CreateUploadUrlAsync(
    string objectPath,
    string mimeType,
    CancellationToken cancellationToken = default);
}
