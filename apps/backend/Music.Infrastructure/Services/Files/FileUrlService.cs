using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Music.Core.Enums;
using Music.Core.Exceptions;
using Music.Core.Models;
using Music.Core.Services.Interfaces;
using Music.Core.Utils;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Files;

public sealed class FileUrlService(IContentService contentService, AppDbContext context) : IFileUrlService
{
    public async Task<string> GetFilePlayUrlAsync(Guid fileObjectId, CancellationToken cancellationToken = default)
    {
        Core.Entities.FileObject fileObject = await context.FileObjects.FirstOrDefaultAsync(file => file.Id == fileObjectId, cancellationToken) ?? throw new EntityNotFoundException($"File object with ID {fileObjectId} not found.");

        return contentService.GetPresignedUrlAsync(fileObject.StoragePath, DateTime.UtcNow.AddMinutes(30), cancellationToken);
    }

    public async Task<MultipartUploadInfo> InitUploadAsync(Guid fileObjectId, CancellationToken cancellationToken = default)
    {
        Core.Entities.FileObject fileObject = await context.FileObjects.FirstOrDefaultAsync(file => file.Id == fileObjectId, cancellationToken) ?? throw new EntityNotFoundException($"File object with ID {fileObjectId} not found.");
        return await contentService.CreateMultipartUploadAsync(fileObject.StoragePath, fileObject.MimeType, fileObject.SizeInBytes, cancellationToken);
    }

    public async Task<string> GetDashManifestAsync(Guid fileObjectId, CancellationToken cancellationToken = default)
    {
        Core.Entities.FileObject fileObject = await context.FileObjects.FirstOrDefaultAsync(file => file.Id == fileObjectId && file.FileObjectVariant == FileObjectVariant.DashAV1, cancellationToken)
            ?? throw new EntityNotFoundException($"File object with ID {fileObjectId} not found.");

        if (fileObject.ProcessingStatus != FileProcessingStatus.Completed)
        {
            throw new ValidationException($"DASH package for file object {fileObjectId} is not ready yet.");
        }

        string storagePath = fileObject.StoragePath.TrimEnd('/');
        string manifestXml = await contentService.ReadTextAsync(DashManifestHelper.CombineStoragePath(storagePath, "manifest.mpd"), cancellationToken);

        return DashManifestHelper.InjectPresignUrl(manifestXml, storagePath, contentService, cancellationToken);
    }
}
