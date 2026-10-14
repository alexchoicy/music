using Microsoft.Extensions.Logging;
using Music.Core.Entities;
using Music.Core.Media.FFmpeg;
using Music.Core.Options;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Storage;
using Music.Infrastructure.Data;
using Music.Infrastructure.Services.Media;

namespace Music.Infrastructure.Workers.Processor;

public class VideoArtworkExtractor(
    IAssetsService assetsService,
    AppDbContext dbContext,
    IFFmpegService ffmpegService,
    IHashService hashService,
    ILogger<VideoArtworkExtractor> logger
)
{
    public async Task ExtractArtworkAsync(
        string sourcePath,
        string artworkDirectory,
        FileObject sourceFileObject,
        MediaProbeResult probeResult,
        ProbeStream videoStream,
        CancellationToken cancellationToken
    )
    {
        ProbeStream? attachedPictureStream = probeResult
            .Streams?.Where(stream =>
                string.Equals(stream.CodecType, "video", StringComparison.OrdinalIgnoreCase)
            )
            .Where(stream => stream.Disposition?.AttachedPic == 1)
            .OrderBy(stream => stream.Index)
            .FirstOrDefault();

        if (attachedPictureStream is not null)
        {
            logger.LogInformation(
                "Extracting attached picture stream {StreamIndex} for video file object {FileObjectId}",
                attachedPictureStream.Index,
                sourceFileObject.Id
            );

            await ExtractAttachedPictureAsync(
                sourcePath,
                artworkDirectory,
                sourceFileObject,
                attachedPictureStream,
                cancellationToken
            );
            return;
        }

        logger.LogInformation(
            "Generating thumbnail from video stream {StreamIndex} for video file object {FileObjectId}",
            videoStream.Index,
            sourceFileObject.Id
        );

        await ExtractVideoThumbnailAsync(
            sourcePath,
            artworkDirectory,
            sourceFileObject,
            probeResult,
            videoStream,
            cancellationToken
        );
    }

    private async Task ExtractAttachedPictureAsync(
        string sourcePath,
        string artworkDirectory,
        FileObject sourceFileObject,
        ProbeStream attachedPictureStream,
        CancellationToken cancellationToken
    )
    {
        (string attachedExtension, string attachedMimeType) =
            FFprobeHelper.GetAttachedPictureFormat(attachedPictureStream);
        string attachedPictureFileName =
            $"{Path.GetFileNameWithoutExtension(GetOriginalFileName(sourceFileObject))}_attached_picture.{attachedExtension}";
        string attachedPictureOutputPath = Path.Combine(artworkDirectory, attachedPictureFileName);

        bool attachedPictureSuccess = await ffmpegService.ExtractAttachedPictureAsync(
            sourcePath,
            attachedPictureStream.Index,
            attachedPictureOutputPath,
            cancellationToken
        );

        if (!attachedPictureSuccess || !File.Exists(attachedPictureOutputPath))
        {
            logger.LogWarning(
                "Failed to extract attached picture stream {StreamIndex} for video file object {FileObjectId}",
                attachedPictureStream.Index,
                sourceFileObject.Id
            );
            return;
        }

        await PersistGeneratedAssetAsync(
            attachedPictureOutputPath,
            sourceFileObject,
            attachedPictureStream,
            FileObjectVariant.AttachedPicture,
            attachedMimeType,
            MediaFolderOptions.AssetsVideoArtwork,
            cancellationToken
        );
    }

    private async Task ExtractVideoThumbnailAsync(
        string sourcePath,
        string artworkDirectory,
        FileObject sourceFileObject,
        MediaProbeResult probeResult,
        ProbeStream videoStream,
        CancellationToken cancellationToken
    )
    {
        string thumbnailFileName =
            $"{Path.GetFileNameWithoutExtension(GetOriginalFileName(sourceFileObject))}_thumbnail.jpg";
        string thumbnailOutputPath = Path.Combine(artworkDirectory, thumbnailFileName);
        double? thumbnailSeekSeconds = FFprobeHelper.GetThumbnailSeekSeconds(
            probeResult.Format?.Duration
        );

        bool thumbnailSuccess = await ffmpegService.ExtractVideoThumbnailAsync(
            sourcePath,
            videoStream.Index,
            thumbnailOutputPath,
            thumbnailSeekSeconds,
            cancellationToken
        );

        if (!thumbnailSuccess || !File.Exists(thumbnailOutputPath))
        {
            logger.LogWarning(
                "Failed to generate thumbnail from video stream {StreamIndex} for video file object {FileObjectId}",
                videoStream.Index,
                sourceFileObject.Id
            );
            return;
        }

        await PersistGeneratedAssetAsync(
            thumbnailOutputPath,
            sourceFileObject,
            videoStream,
            FileObjectVariant.Thumbnail640x360,
            "image/jpeg",
            MediaFolderOptions.AssetsVideoArtwork,
            cancellationToken
        );
    }

    public async Task PersistGeneratedAssetAsync(
        string assetPath,
        FileObject sourceFileObject,
        ProbeStream stream,
        FileObjectVariant variant,
        string mimeType,
        MediaFolderOptions assetsFolder,
        CancellationToken cancellationToken
    )
    {
        string hash = await hashService.ComputeBlake3HashAsync(assetPath, cancellationToken);
        string fileName = Path.GetFileName(assetPath);
        string storagePath = assetsService.GetStoragePath(assetsFolder, hash, mimeType, fileName);

        logger.LogInformation(
            "Uploading generated asset {Variant} for video file object {FileObjectId} to {StoragePath}",
            variant,
            sourceFileObject.Id,
            storagePath
        );

        await assetsService.UploadFileFromTempAsync(
            storagePath,
            assetPath,
            mimeType,
            cancellationToken
        );

        logger.LogInformation(
            "Uploaded generated asset {Variant} for video file object {FileObjectId}: {FileName}, {SizeInBytes} bytes",
            variant,
            sourceFileObject.Id,
            fileName,
            new FileInfo(assetPath).Length
        );

        FileObject assetFileObject = new()
        {
            FileId = sourceFileObject.FileId,
            FileObjectVariant = variant,
            StorageArea = StorageArea.Assets,
            StoragePath = storagePath,
            ObjectBlake3Hash = hash,
            SizeInBytes = new FileInfo(assetPath).Length,
            MimeType = mimeType,
            Container = mimeType,
            Extension = Path.GetExtension(assetPath).TrimStart('.'),
            Codec = string.IsNullOrWhiteSpace(stream.CodecName)
                ? null
                : stream.CodecName.ToUpperInvariant(),
            Lossless = false,
            Width = stream.Width,
            Height = stream.Height,
            DurationInMs = sourceFileObject.DurationInMs,
            ProcessingStatus = FileProcessingStatus.Completed,
        };

        dbContext.FileObjects.Add(assetFileObject);
    }

    public static string GetOriginalFileName(FileObject sourceFileObject)
    {
        return string.IsNullOrWhiteSpace(sourceFileObject.File?.OriginalFileName)
            ? sourceFileObject.Id.ToString()
            : sourceFileObject.File.OriginalFileName;
    }
}
