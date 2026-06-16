using Microsoft.EntityFrameworkCore;
using Music.Core.Common.Exceptions;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Storage;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Files;

public class FileUrlService(IContentService contentService, AppDbContext context) : IFileUrlService
{
    private static bool IsDashVariant(FileObjectVariant variant)
    {
        return variant == FileObjectVariant.DashAV1;
    }

    public async Task<string> GetDashManifestAsync(
        Guid fileObjectId,
        CancellationToken cancellationToken = default
    )
    {
        // Core.Entities.FileObject fileObject =
        //     await context.FileObjects.FirstOrDefaultAsync(
        //         file => file.Id == fileObjectId,
        //         cancellationToken
        //     )
        //     ?? throw new EntityNotFoundException($"File object with ID {fileObjectId} not found.");

        // if (!IsDashVariant(fileObject.FileObjectVariant))
        // {
        //     throw new ValidationException(
        //         $"File object {fileObjectId} does not expose a DASH manifest."
        //     );
        // }

        // if (fileObject.ProcessingStatus != FileProcessingStatus.Completed)
        // {
        //     throw new ValidationException(
        //         $"DASH package for file object {fileObjectId} is not ready yet."
        //     );
        // }

        // string storagePath = fileObject.StoragePath.TrimEnd('/');
        // string manifestXml = await contentService.ReadTextAsync(
        //     DashManifestHelper.CombineStoragePath(storagePath, "manifest.mpd"),
        //     cancellationToken
        // );

        // return DashManifestHelper.InjectPresignUrl(
        //     manifestXml,
        //     storagePath,
        //     contentService,
        //     cancellationToken
        // );
        throw new NotImplementedException();
    }

    public async Task<string> GetFilePlayUrlAsync(
        Guid fileObjectId,
        CancellationToken cancellationToken = default
    )
    {
        Core.Entities.FileObject fileObject =
            await context.FileObjects.FirstOrDefaultAsync(
                file => file.Id == fileObjectId,
                cancellationToken
            )
            ?? throw new EntityNotFoundException($"File object with ID {fileObjectId} not found.");

        if (IsDashVariant(fileObject.FileObjectVariant))
        {
            return $"{contentService.GetUrl(fileObject.Id)}/manifest.mpd";
        }

        return contentService.GetPresignedUrl(
            fileObject.StoragePath,
            DateTime.UtcNow.AddMinutes(30),
            null,
            cancellationToken
        );
    }
}
