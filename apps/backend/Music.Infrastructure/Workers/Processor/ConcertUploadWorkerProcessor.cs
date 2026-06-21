using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Music.Core.Common.Exceptions;
using Music.Core.Common.Utils;
using Music.Core.Entities;
using Music.Core.Media.FFmpeg;
using Music.Core.Options;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Storage;
using Music.Core.Workers;
using Music.Infrastructure.Data;
using Music.Infrastructure.Services.Media;

namespace Music.Infrastructure.Workers.Processor;

public class ConcertUploadWorkerProcessor(
    IContentService contentService,
    IAssetsService assetsService,
    AppDbContext dbContext,
    IMediaProbeService ffprobeService,
    IFFmpegService ffmpegService,
    IHashService hashService,
    IOptions<StorageOptions> storageOptions,
    ILogger<ConcertUploadWorkerProcessor> logger
)
{
    private const int MaxRawVideoBitrate = 30_000_000;

    private enum VideoProcessingPlan
    {
        UseOriginal,
        RemuxOriginal,
        ConvertToDashAv1,
    }

    public async Task ProcessAsync(
        ConcertUploadProcessWorker job,
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

        Guid derivedFileId = Guid.CreateVersion7();

        string? sourcePath = null;
        string? outputDirectory = null;
        try
        {
            sourcePath = Path.Combine(
                storage.TempDir,
                $"video_{sourceFileObject.Id}.{sourceFileObject.Extension}"
            );
            outputDirectory = Path.Combine(storage.TempDir, $"dash_{derivedFileId}");

            Directory.CreateDirectory(outputDirectory);

            logger.LogInformation(
                "Processing concert upload for file object ID {FileObjectId}",
                sourceFileObject.Id
            );

            await contentService.DownloadFileToTemp(
                sourceFileObject.StoragePath,
                sourcePath,
                cancellationToken
            );

            logger.LogInformation(
                "Probing media file for file object ID {FileObjectId}",
                sourceFileObject.Id
            );

            MediaProbeResult? probeResult =
                await ffprobeService.ProbeAsync(sourcePath, cancellationToken)
                ?? throw new InvalidOperationException(
                    $"Unable to probe video file object ID {sourceFileObject.Id}."
                );

            ProbeStream videoStream = FFprobeHelper.GetPrimaryVideoStream(
                probeResult,
                sourceFileObject.Id
            );
            List<ProbeStream> audioStreams = FFprobeHelper.GetAudioStreams(probeResult);

            UpdateSourceFileObject(sourceFileObject, videoStream, audioStreams, probeResult);

            await dbContext.SaveChangesAsync(cancellationToken);

            VideoProcessingPlan processingPlan = GetVideoProcessingPlan(
                sourceFileObject,
                videoStream,
                audioStreams,
                probeResult
            );

            if (processingPlan == VideoProcessingPlan.ConvertToDashAv1)
            {
                await CreateDashAv1VariantAsync(
                    sourcePath,
                    outputDirectory,
                    derivedFileId,
                    sourceFileObject,
                    probeResult,
                    videoStream,
                    storage,
                    cancellationToken
                );
            }
            else if (processingPlan == VideoProcessingPlan.RemuxOriginal)
            {
                await CreateRemuxedOriginalVariantAsync(
                    sourcePath,
                    outputDirectory,
                    sourceFileObject,
                    videoStream,
                    audioStreams.FirstOrDefault(),
                    cancellationToken
                );
            }
            string subtitlesDirectory = Path.Combine(outputDirectory, "subtitles");
            string artworkDirectory = Path.Combine(outputDirectory, "artwork");

            Directory.CreateDirectory(subtitlesDirectory);
            Directory.CreateDirectory(artworkDirectory);

            await ExtractSubtitlesAsync(
                sourcePath,
                subtitlesDirectory,
                sourceFileObject,
                probeResult,
                cancellationToken
            );
            await ExtractArtworkAsync(
                sourcePath,
                artworkDirectory,
                sourceFileObject,
                probeResult,
                videoStream,
                cancellationToken
            );

            await dbContext.SaveChangesAsync(cancellationToken);
        }
        finally
        {
            WorkerFileOperations.TryDeleteTempFile(sourcePath, logger);
            WorkerFileOperations.TryDeleteTempDirectory(outputDirectory, logger);
        }
    }

    private async Task CreateDashAv1VariantAsync(
        string sourcePath,
        string outputDirectory,
        Guid derivedFileId,
        FileObject sourceFileObject,
        MediaProbeResult probeResult,
        ProbeStream videoStream,
        StorageOptions storage,
        CancellationToken cancellationToken
    )
    {
        bool success = await ffmpegService.ConvertVideoToAv1DashAsync(
            sourcePath,
            outputDirectory,
            probeResult,
            cancellationToken
        );

        if (!success)
        {
            throw new InvalidOperationException(
                $"FFmpeg failed to convert file object ID {sourceFileObject.Id} to DASH."
            );
        }

        string manifestPath = Path.Combine(outputDirectory, "manifest.mpd");
        if (!File.Exists(manifestPath))
        {
            throw new FileNotFoundException("DASH manifest was not generated.", manifestPath);
        }

        DashManifestHelper.InjectAudioLabelsIntoDashManifest(manifestPath, probeResult);

        string derivedVideoRoot = MediaFolderOptions
            .DerivedVideo.GetFolder(storage.MediaFolders)
            .TrimEnd('/');

        try
        {
            FileObject derivedFileObject = await CreateDerivedDashFileObjectAsync(
                sourceFileObject,
                derivedFileId,
                outputDirectory,
                manifestPath,
                derivedVideoRoot,
                videoStream,
                cancellationToken
            );

            dbContext.FileObjects.Add(derivedFileObject);

            await WorkerFileOperations.UploadDirectoryAsync(
                contentService,
                outputDirectory,
                derivedFileObject.StoragePath,
                logger,
                cancellationToken
            );
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Failed to persist DASH variant for video file object {FileObjectId}",
                sourceFileObject.Id
            );
        }
    }

    private async Task CreateRemuxedOriginalVariantAsync(
        string sourcePath,
        string outputDirectory,
        FileObject sourceFileObject,
        ProbeStream videoStream,
        ProbeStream? audioStream,
        CancellationToken cancellationToken
    )
    {
        (string extension, string mimeType) = GetRemuxOutputFormat(videoStream, audioStream);
        string remuxPath = Path.Combine(outputDirectory, $"remuxed.{extension}");
        bool success = await ffmpegService.RemuxVideoForWebAsync(
            sourcePath,
            remuxPath,
            cancellationToken
        );

        if (!success || !File.Exists(remuxPath))
        {
            throw new InvalidOperationException(
                $"FFmpeg failed to remux file object ID {sourceFileObject.Id}."
            );
        }

        await EnsureRemuxHasAudioAsync(
            remuxPath,
            sourceFileObject.Id,
            audioStream,
            cancellationToken
        );

        string hash = await hashService.ComputeBlake3HashAsync(remuxPath, cancellationToken);
        string storagePath = contentService.GetStoragePath(
            MediaFolderOptions.DerivedVideo,
            hash,
            mimeType,
            Path.GetFileName(remuxPath)
        );

        await contentService.UploadFileFromTempAsync(
            storagePath,
            remuxPath,
            mimeType,
            cancellationToken
        );

        FileObject remuxedFileObject = new()
        {
            FileId = sourceFileObject.FileId,
            FileObjectVariant = FileObjectVariant.RemuxedOriginal,
            StorageArea = StorageArea.Content,
            StoragePath = storagePath,
            ObjectBlake3Hash = hash,
            SizeInBytes = new FileInfo(remuxPath).Length,
            MimeType = mimeType,
            Container = extension,
            Extension = extension,
            Codec = sourceFileObject.Codec,
            Lossless = false,
            Width = sourceFileObject.Width,
            Height = sourceFileObject.Height,
            FrameRate = sourceFileObject.FrameRate,
            DurationInMs = sourceFileObject.DurationInMs,
            ProcessingStatus = FileProcessingStatus.Completed,
        };

        dbContext.FileObjects.Add(remuxedFileObject);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureRemuxHasAudioAsync(
        string remuxPath,
        Guid sourceFileObjectId,
        ProbeStream? expectedAudioStream,
        CancellationToken cancellationToken
    )
    {
        if (expectedAudioStream is null)
        {
            return;
        }

        MediaProbeResult remuxProbe =
            await ffprobeService.ProbeAsync(remuxPath, cancellationToken)
            ?? throw new InvalidOperationException(
                $"Unable to probe remuxed file for file object ID {sourceFileObjectId}."
            );

        if (FFprobeHelper.GetAudioStreams(remuxProbe).Count == 0)
        {
            throw new InvalidOperationException(
                $"Remuxed file object ID {sourceFileObjectId} did not preserve audio."
            );
        }
    }

    private static VideoProcessingPlan GetVideoProcessingPlan(
        FileObject sourceFileObject,
        ProbeStream videoStream,
        IReadOnlyList<ProbeStream> audioStreams,
        MediaProbeResult probeResult
    )
    {
        ProbeStream? audioStream = audioStreams.FirstOrDefault();

        if (
            audioStreams.Count > 1
            || FFmpegHelper.IsInterlaced(videoStream.FieldOrder)
            || FFmpegHelper.IsHdrVideo(videoStream)
            || IsHighBitrateVideo(videoStream, probeResult)
            || !IsBrowserSafeCodecPair(videoStream, audioStream)
        )
        {
            return VideoProcessingPlan.ConvertToDashAv1;
        }

        if (IsBrowserSafeContainer(sourceFileObject, videoStream, audioStream))
        {
            return VideoProcessingPlan.UseOriginal;
        }

        return IsRemuxableContainer(sourceFileObject.Extension)
            ? VideoProcessingPlan.RemuxOriginal
            : VideoProcessingPlan.ConvertToDashAv1;
    }

    private static bool IsHighBitrateVideo(ProbeStream videoStream, MediaProbeResult probeResult)
    {
        return MediaFiles.GetBestAvailableBitrate(videoStream, probeResult.Format)
            > MaxRawVideoBitrate;
    }

    private static bool IsBrowserSafeCodecPair(ProbeStream videoStream, ProbeStream? audioStream)
    {
        return IsWebmCodecPair(videoStream, audioStream)
            || IsMp4CodecPair(videoStream, audioStream);
    }

    private static bool IsBrowserSafeContainer(
        FileObject sourceFileObject,
        ProbeStream videoStream,
        ProbeStream? audioStream
    )
    {
        string extension = sourceFileObject.Extension.TrimStart('.');

        return (IsWebmContainer(extension) && IsWebmCodecPair(videoStream, audioStream))
            || (IsMp4Container(extension) && IsMp4CodecPair(videoStream, audioStream));
    }

    private static bool IsWebmCodecPair(ProbeStream videoStream, ProbeStream? audioStream)
    {
        return IsCodec(videoStream, "vp8", "vp9", "av1")
            && (audioStream is null || IsCodec(audioStream, "opus", "vorbis"));
    }

    private static bool IsMp4CodecPair(ProbeStream videoStream, ProbeStream? audioStream)
    {
        if (IsCodec(videoStream, "h264"))
        {
            return audioStream is null || IsCodec(audioStream, "aac", "opus", "flac");
        }

        if (IsCodec(videoStream, "vp9", "av1"))
        {
            return audioStream is null || IsCodec(audioStream, "aac");
        }

        return IsCodec(videoStream, "hevc", "h265")
            && (audioStream is null || IsCodec(audioStream, "aac", "opus", "flac"));
    }

    private static (string extension, string mimeType) GetRemuxOutputFormat(
        ProbeStream videoStream,
        ProbeStream? audioStream
    )
    {
        return IsWebmCodecPair(videoStream, audioStream)
            ? ("webm", "video/webm")
            : ("mp4", "video/mp4");
    }

    private static bool IsRemuxableContainer(string extension)
    {
        extension = extension.TrimStart('.');

        return extension.Equals("mkv", StringComparison.OrdinalIgnoreCase)
            || extension.Equals("mks", StringComparison.OrdinalIgnoreCase)
            || extension.Equals("mk3d", StringComparison.OrdinalIgnoreCase)
            || extension.Equals("mov", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsWebmContainer(string extension)
    {
        return extension.Equals("webm", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsMp4Container(string extension)
    {
        return extension.Equals("mp4", StringComparison.OrdinalIgnoreCase)
            || extension.Equals("m4v", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsCodec(ProbeStream stream, params string[] codecNames)
    {
        return codecNames.Any(codecName =>
            string.Equals(stream.CodecName, codecName, StringComparison.OrdinalIgnoreCase)
        );
    }

    private async Task ExtractSubtitlesAsync(
        string sourcePath,
        string subtitlesDirectory,
        FileObject sourceFileObject,
        MediaProbeResult probeResult,
        CancellationToken cancellationToken
    )
    {
        foreach (
            ProbeStream subtitleStream in (probeResult.Streams ?? [])
                .Where(stream =>
                    string.Equals(stream.CodecType, "subtitle", StringComparison.OrdinalIgnoreCase)
                )
                .OrderBy(stream => stream.Index)
        )
        {
            (string extension, string mimeType, FileObjectVariant variant)? subtitlePlan =
                FFprobeHelper.GetSubtitleExtractionPlan(subtitleStream.CodecName);

            if (subtitlePlan is null)
            {
                logger.LogWarning(
                    "Skipping unsupported subtitle codec {CodecName} for video file object {FileObjectId}",
                    subtitleStream.CodecName,
                    sourceFileObject.Id
                );
                continue;
            }

            string subtitleFileName = FFprobeHelper.BuildSubtitleFileName(
                subtitleStream,
                subtitlePlan.Value.extension
            );
            string subtitleOutputPath = Path.Combine(subtitlesDirectory, subtitleFileName);

            bool subtitleSuccess =
                subtitlePlan.Value.variant == FileObjectVariant.SubtitleSup
                    ? await ffmpegService.ExtractPgsSubtitleToSupAsync(
                        sourcePath,
                        subtitleStream.Index,
                        subtitleOutputPath,
                        cancellationToken
                    )
                    : await ffmpegService.ExtractTextSubtitleToVttAsync(
                        sourcePath,
                        subtitleStream.Index,
                        subtitleOutputPath,
                        cancellationToken
                    );

            if (!subtitleSuccess || !File.Exists(subtitleOutputPath))
            {
                logger.LogWarning(
                    "Failed to extract subtitle stream {StreamIndex} for video file object {FileObjectId}",
                    subtitleStream.Index,
                    sourceFileObject.Id
                );
                continue;
            }

            await PersistGeneratedAssetAsync(
                subtitleOutputPath,
                sourceFileObject,
                subtitleStream,
                subtitlePlan.Value.variant,
                subtitlePlan.Value.mimeType,
                MediaFolderOptions.AssetsVideoSubtitle,
                cancellationToken
            );
        }
    }

    private async Task ExtractArtworkAsync(
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
            await ExtractAttachedPictureAsync(
                sourcePath,
                artworkDirectory,
                sourceFileObject,
                attachedPictureStream,
                cancellationToken
            );
            return;
        }

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

    private async Task PersistGeneratedAssetAsync(
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

        await assetsService.UploadFileFromTempAsync(
            storagePath,
            assetPath,
            mimeType,
            cancellationToken
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

    private async Task<FileObject> CreateDerivedDashFileObjectAsync(
        FileObject sourceFileObject,
        Guid derivedFileId,
        string outputDirectory,
        string manifestPath,
        string derivedVideoRoot,
        ProbeStream videoStream,
        CancellationToken cancellationToken
    )
    {
        string manifestHash = await hashService.ComputeBlake3HashAsync(
            manifestPath,
            cancellationToken
        );

        return new FileObject
        {
            Id = derivedFileId,
            FileId = sourceFileObject.FileId,
            FileObjectVariant = FileObjectVariant.DashAV1,
            StorageArea = StorageArea.Content,
            StoragePath = $"{derivedVideoRoot}/{derivedFileId}",
            ObjectBlake3Hash = manifestHash,
            SizeInBytes = WorkerFileOperations.GetDirectorySizeInBytes(outputDirectory),
            MimeType = "application/dash+xml",
            Container = "webm",
            Extension = "mpd",
            Codec = "AV1",
            Lossless = false,
            Width = videoStream.Width,
            Height = videoStream.Height,
            FrameRate = sourceFileObject.FrameRate,
            DurationInMs = sourceFileObject.DurationInMs,
            ProcessingStatus = FileProcessingStatus.Completed,
        };
    }

    private static string GetOriginalFileName(FileObject sourceFileObject)
    {
        return string.IsNullOrWhiteSpace(sourceFileObject.File?.OriginalFileName)
            ? sourceFileObject.Id.ToString()
            : sourceFileObject.File.OriginalFileName;
    }

    private static void UpdateSourceFileObject(
        FileObject sourceFileObject,
        ProbeStream videoStream,
        IReadOnlyList<ProbeStream> audioStreams,
        MediaProbeResult probeResult
    )
    {
        double? fps =
            MediaFiles.ParseFrameRate(videoStream.AvgFrameRate)
            ?? MediaFiles.ParseFrameRate(videoStream.RFrameRate);

        sourceFileObject.Codec = string.IsNullOrWhiteSpace(videoStream.CodecName)
            ? sourceFileObject.Codec
            : videoStream.CodecName.ToUpperInvariant();
        sourceFileObject.Width = videoStream.Width ?? sourceFileObject.Width;
        sourceFileObject.Height = videoStream.Height ?? sourceFileObject.Height;
        sourceFileObject.FrameRate = fps.HasValue
            ? Convert.ToDecimal(fps.Value, CultureInfo.InvariantCulture)
            : sourceFileObject.FrameRate;
        sourceFileObject.Bitrate = probeResult.Format?.BitRate ?? sourceFileObject.Bitrate;
        sourceFileObject.AudioSampleRate =
            audioStreams.FirstOrDefault()?.SampleRate ?? sourceFileObject.AudioSampleRate;

        sourceFileObject.ProcessingStatus = FileProcessingStatus.Completed;

        if (probeResult.Format?.Duration is double durationSeconds)
        {
            sourceFileObject.DurationInMs = (int)
                Math.Round(durationSeconds * 1000, MidpointRounding.AwayFromZero);
        }
    }
}
