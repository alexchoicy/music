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

        if (IsDashVariant(fileObject.FileObjectVariant))
        {
            return $"{contentService.GetUrl(fileObject.Id)}/manifest.mpd";
        }

        return contentService.GetPresignedUrlAsync(fileObject.StoragePath, DateTime.UtcNow.AddMinutes(30), cancellationToken);
    }

    public async Task<MultipartUploadInfo> InitUploadAsync(Guid fileObjectId, CancellationToken cancellationToken = default)
    {
        Core.Entities.FileObject fileObject = await context.FileObjects.FirstOrDefaultAsync(file => file.Id == fileObjectId, cancellationToken) ?? throw new EntityNotFoundException($"File object with ID {fileObjectId} not found.");
        return await contentService.CreateMultipartUploadAsync(fileObject.StoragePath, fileObject.MimeType, fileObject.SizeInBytes, cancellationToken);
    }

    public async Task<string> GetDashManifestAsync(Guid fileObjectId, CancellationToken cancellationToken = default)
    {
        Core.Entities.FileObject fileObject = await context.FileObjects.FirstOrDefaultAsync(file => file.Id == fileObjectId, cancellationToken)
            ?? throw new EntityNotFoundException($"File object with ID {fileObjectId} not found.");

        if (!IsDashVariant(fileObject.FileObjectVariant))
        {
            throw new ValidationException($"File object {fileObjectId} does not expose a DASH manifest.");
        }

        if (fileObject.ProcessingStatus != FileProcessingStatus.Completed)
        {
            throw new ValidationException($"DASH package for file object {fileObjectId} is not ready yet.");
        }

        string storagePath = fileObject.StoragePath.TrimEnd('/');
        string manifestXml = await contentService.ReadTextAsync(DashManifestHelper.CombineStoragePath(storagePath, "manifest.mpd"), cancellationToken);

        return DashManifestHelper.InjectPresignUrl(manifestXml, storagePath, contentService, cancellationToken);
    }

    private static bool IsDashVariant(FileObjectVariant variant)
    {
        return variant is FileObjectVariant.DashAV1 or FileObjectVariant.OriginalDash;
    }
}
