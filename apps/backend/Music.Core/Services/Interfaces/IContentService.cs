using System.Net.Mime;
using Music.Core.Enums;

namespace Music.Core.Services.Interfaces;

public interface IContentService : IStorageService
{
    public Task<string> CreateUploadUrlAsync(
        string objectPath,
        string mimeType,
        CancellationToken cancellationToken = default);
}
