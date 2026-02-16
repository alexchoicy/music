using Microsoft.EntityFrameworkCore;
using Music.Core.Exceptions;
using Music.Core.Services.Interfaces;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Files;

public sealed class FileUrlService(IContentService contentService, AppDbContext context) : IFileUrlService
{

    public Task<string> GetFileUrlAsync(Guid fileObjectId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public async Task<string> GetFilePlayUrlAsync(Guid fileObjectId, CancellationToken cancellationToken = default)
    {
        Core.Entities.FileObject fileObject = await context.FileObjects.FirstAsync(file => file.Id == fileObjectId, cancellationToken) ?? throw new EntityNotFoundException($"File object with ID {fileObjectId} not found.");

        return contentService.GetPlayPresignedUrlAsync(fileObject.StoragePath, cancellationToken);
    }
}
