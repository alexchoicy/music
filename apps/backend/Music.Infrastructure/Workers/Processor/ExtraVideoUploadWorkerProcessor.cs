using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Music.Core.Common.Exceptions;
using Music.Core.Entities;
using Music.Core.Media.FFmpeg;
using Music.Core.Options;
using Music.Core.Services.Files.Enums;
using Music.Core.Storage;
using Music.Core.Workers;
using Music.Infrastructure.Data;
using Music.Infrastructure.Services.Media;

namespace Music.Infrastructure.Workers.Processor;

// Extra videos are served as uploaded; processing only extracts their cover artwork.
public class ExtraVideoUploadWorkerProcessor(
    IContentService contentService,
    AppDbContext dbContext,
    IMediaProbeService ffprobeService,
    VideoArtworkExtractor videoArtworkExtractor,
    IOptions<StorageOptions> storageOptions,
    ILogger<ExtraVideoUploadWorkerProcessor> logger
)
{
    public async Task ProcessAsync(
        ExtraVideoUploadProcessWorker job,
        CancellationToken cancellationToken
    )
    {
        StorageOptions storage = storageOptions.Value;
        FileObject sourceFileObject =
            await dbContext
                .FileObjects.Include(fo => fo.File)
                .FirstOrDefaultAsync(fo => fo.Id == job.FileObjectId, cancellationToken)
            ?? throw new EntityNotFoundException(
                $"File object with ID {job.FileObjectId} not found."
            );

        if (sourceFileObject.ProcessingStatus == FileProcessingStatus.Completed)
            throw new InvalidOperationException("Cannot process a completed file object.");

        sourceFileObject.ProcessingStatus = FileProcessingStatus.Processing;
        await dbContext.SaveChangesAsync(cancellationToken);

        string sourcePath = Path.Combine(
            storage.TempDir,
            $"extra_video_{sourceFileObject.Id}.{sourceFileObject.Extension}"
        );
        string artworkDirectory = Path.Combine(
            storage.TempDir,
            $"extra_video_artwork_{sourceFileObject.Id}"
        );

        try
        {
            Directory.CreateDirectory(artworkDirectory);

            await contentService.DownloadFileToTemp(
                sourceFileObject.StoragePath,
                sourcePath,
                cancellationToken
            );

            MediaProbeResult probeResult =
                await ffprobeService.ProbeAsync(sourcePath, cancellationToken)
                ?? throw new InvalidOperationException(
                    $"Unable to probe video file object ID {sourceFileObject.Id}."
                );

            ProbeStream videoStream = FFprobeHelper.GetPrimaryVideoStream(
                probeResult,
                sourceFileObject.Id
            );

            await videoArtworkExtractor.ExtractArtworkAsync(
                sourcePath,
                artworkDirectory,
                sourceFileObject,
                probeResult,
                videoStream,
                cancellationToken
            );
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // The original stays playable without artwork
            logger.LogWarning(
                ex,
                "Failed to extract artwork for extra video file object {FileObjectId}",
                sourceFileObject.Id
            );
        }
        finally
        {
            WorkerFileOperations.TryDeleteTempFile(sourcePath, logger);
            WorkerFileOperations.TryDeleteTempDirectory(artworkDirectory, logger);
        }

        sourceFileObject.ProcessingStatus = FileProcessingStatus.Completed;
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
