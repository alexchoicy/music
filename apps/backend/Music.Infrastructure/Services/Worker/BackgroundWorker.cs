using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Music.Core.Entities;
using Music.Core.Enums;
using Music.Core.Exceptions;
using Music.Core.Models;
using Music.Core.Services.FFmpeg;
using Music.Core.Services.Interfaces;
using Music.Core.Utils;
using Music.Infrastructure.Data;
using Music.Infrastructure.Services.Storage;

namespace Music.Infrastructure.Services.Worker;

public sealed class BackgroundWorker(
    IBackgroundTaskQueue queue,
    IServiceScopeFactory scopeFactory,
    ILogger<BackgroundWorker> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            WorkerModel workerModel = await queue.DequeueWorkerAsync(stoppingToken);
            try
            {
                // TODO: run waveform/opus generation here.
                switch (workerModel)
                {
                    case TrackUploadProcessWorkerModel trackUploadWorker:
                        await ProcessTrackUploadAsync(trackUploadWorker, scopeFactory, logger, stoppingToken);
                        break;
                    case PartyInfoEnrichmentWorkerModel partyExternalEnrichmentWorker:
                        await ProcessPartyExternalEnrichmentAsync(partyExternalEnrichmentWorker, scopeFactory, stoppingToken);
                        break;
                    case ConcertUploadProcessWorkerModel concertUploadWorker:
                        await ProcessConcertUploadAsync(concertUploadWorker, scopeFactory, logger, stoppingToken);
                        break;
                    default:
                        logger.LogWarning("Unknown worker type {WorkerType}", workerModel.GetType().Name);
                        break;
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Storage background processing failed for file object.");
            }
        }
    }

    private static async Task ProcessConcertUploadAsync(
        ConcertUploadProcessWorkerModel job,
        IServiceScopeFactory scopeFactory,
        ILogger<BackgroundWorker> logger,
        CancellationToken cancellationToken)
    {
        using IServiceScope scope = scopeFactory.CreateScope();
        IContentService contentService = scope.ServiceProvider.GetRequiredService<IContentService>();
        IAssetsService assetsService = scope.ServiceProvider.GetRequiredService<IAssetsService>();
        AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        IMediaProbeService mediaProbeService = scope.ServiceProvider.GetRequiredService<IMediaProbeService>();
        IMediaFFmpegService mediaFFmpegService = scope.ServiceProvider.GetRequiredService<IMediaFFmpegService>();
        IHashService hashService = scope.ServiceProvider.GetRequiredService<IHashService>();

        StorageOptions storageOptions = scope.ServiceProvider
            .GetRequiredService<IOptions<StorageOptions>>()
            .Value;

        string tempDir = storageOptions.TempDir;

        FileObject sourceFileObject = await dbContext.FileObjects.FirstOrDefaultAsync(
            fo => fo.Id == job.FileObjectId, cancellationToken)
            ?? throw new EntityNotFoundException($"File object with ID {job.FileObjectId} not found."
        );

        Guid derivedFileId = Guid.CreateVersion7();

        string? sourcePath = null;
        string? outputDirectory = null;
        try
        {
            sourcePath = Path.Combine(storageOptions.TempDir, $"video_{sourceFileObject.Id}.{sourceFileObject.Extension}");
            outputDirectory = Path.Combine(storageOptions.TempDir, $"dash_{derivedFileId}");

            Directory.CreateDirectory(outputDirectory);

            logger.LogInformation("Processing concert upload for file object ID {FileObjectId}", sourceFileObject.Id);

            await contentService.DownloadFileToTemp(sourceFileObject.StoragePath, sourcePath, cancellationToken);

            logger.LogInformation("Probing media file for file object ID {FileObjectId}", sourceFileObject.Id);

            MediaProbeResult? probeResult = await mediaProbeService.ProbeAsync(sourcePath);

            if (probeResult is null)
            {
                throw new InvalidOperationException($"Unable to probe video file object ID {sourceFileObject.Id}.");
            }

            ProbeStream videoStream = probeResult.Streams?
                .Where(s => string.Equals(s.CodecType, "video", StringComparison.OrdinalIgnoreCase))
                .Where(s => s.Disposition?.AttachedPic != 1)
                .OrderBy(s => s.Index)
                .FirstOrDefault()
                ?? throw new InvalidOperationException($"No real video stream found for file object ID {sourceFileObject.Id}.");

            List<ProbeStream> audioStreams = (probeResult.Streams ?? [])
                .Where(s => string.Equals(s.CodecType, "audio", StringComparison.OrdinalIgnoreCase))
                .OrderBy(s => s.Index)
                .ToList();

            double? fps = MediaFiles.ParseFrameRate(videoStream.AvgFrameRate) ?? MediaFiles.ParseFrameRate(videoStream.RFrameRate);

            sourceFileObject.Codec = string.IsNullOrWhiteSpace(videoStream.CodecName)
                ? sourceFileObject.Codec
                : videoStream.CodecName.ToUpperInvariant();
            sourceFileObject.Width = videoStream.Width ?? sourceFileObject.Width;
            sourceFileObject.Height = videoStream.Height ?? sourceFileObject.Height;
            sourceFileObject.FrameRate = fps.HasValue ? Convert.ToDecimal(fps.Value, CultureInfo.InvariantCulture) : sourceFileObject.FrameRate;
            sourceFileObject.Bitrate = probeResult.Format?.BitRate ?? sourceFileObject.Bitrate;
            sourceFileObject.AudioSampleRate = audioStreams.FirstOrDefault()?.SampleRate ?? sourceFileObject.AudioSampleRate;


            if (probeResult.Format?.Duration is double durationSeconds)
            {
                sourceFileObject.DurationInMs = (int)Math.Round(durationSeconds * 1000, MidpointRounding.AwayFromZero);
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            ConcertDashPlan concertDashPlan = GetConcertDashPlan(videoStream, audioStreams, probeResult.Format?.BitRate);

            bool success = concertDashPlan.Kind switch
            {
                ConcertDashKind.PackageMp4 => await mediaFFmpegService.PackageVideoToMp4DashAsync(
                    sourcePath,
                    outputDirectory,
                    probeResult,
                    cancellationToken),
                ConcertDashKind.PackageWebM => await mediaFFmpegService.PackageVideoToWebMDashAsync(
                    sourcePath,
                    outputDirectory,
                    probeResult,
                    cancellationToken),
                ConcertDashKind.TranscodeAv1WebM => await mediaFFmpegService.ConvertVideoToAv1DashAsync(
                    sourcePath,
                    outputDirectory,
                    probeResult,
                    cancellationToken),
                _ => false
            };

            if (!success)
            {
                throw new InvalidOperationException($"FFmpeg failed to convert file object ID {sourceFileObject.Id} to DASH.");
            }

            string manifestPath = Path.Combine(outputDirectory, "manifest.mpd");
            if (!File.Exists(manifestPath))
            {
                throw new FileNotFoundException("DASH manifest was not generated.", manifestPath);
            }

            DashManifestHelper.InjectAudioLabelsIntoDashManifest(manifestPath, probeResult);

            string derivedVideoRoot = MediaFolderOptions.DerivedVideo.GetFolder(storageOptions.MediaFolders).TrimEnd('/');

            string manifestHash = await hashService.ComputeBlake3HashAsync(manifestPath, cancellationToken);

            FileObject derivedFileObject = new()
            {
                Id = derivedFileId,
                FileId = sourceFileObject.FileId,
                FileObjectVariant = FileObjectVariant.DashAV1,
                StoragePath = $"{derivedVideoRoot}/{derivedFileId}",
                OriginalBlake3Hash = manifestHash,
                CurrentBlake3Hash = manifestHash,
                Type = FileObjectType.Transcoded,
                SizeInBytes = GetDirectorySizeInBytes(outputDirectory),
                MimeType = "application/dash+xml",
                Container = concertDashPlan.Container,
                Extension = "mpd",
                Codec = concertDashPlan.Kind == ConcertDashKind.TranscodeAv1WebM ? "AV1" : sourceFileObject.Codec,
                Width = videoStream.Width,
                Height = videoStream.Height,
                FrameRate = sourceFileObject.FrameRate,
                DurationInMs = sourceFileObject.DurationInMs,
                OriginalFileName = $"{Path.GetFileNameWithoutExtension(sourceFileObject.OriginalFileName)}.manifest.mpd",
                CreatedByUserId = sourceFileObject.CreatedByUserId,
                ProcessingStatus = FileProcessingStatus.Completed,
            };

            dbContext.FileObjects.Add(derivedFileObject);

            await UploadDirectoryAsync(contentService, outputDirectory, derivedFileObject.StoragePath, cancellationToken);

            string subtitlesDirectory = Path.Combine(outputDirectory, "subtitles");
            string artworkDirectory = Path.Combine(outputDirectory, "artwork");

            Directory.CreateDirectory(subtitlesDirectory);
            Directory.CreateDirectory(artworkDirectory);

            foreach (ProbeStream subtitleStream in (probeResult.Streams ?? [])
                         .Where(stream => string.Equals(stream.CodecType, "subtitle", StringComparison.OrdinalIgnoreCase))
                         .OrderBy(stream => stream.Index))
            {
                string normalizedCodec = (subtitleStream.CodecName ?? string.Empty).Trim().ToLowerInvariant();

                (string extension, string mimeType, FileObjectVariant variant)? subtitlePlan =
                    GetSubtitleExtractionPlan(subtitleStream.CodecName);

                if (subtitlePlan is null)
                {
                    logger.LogWarning(
                        "Skipping unsupported subtitle codec {CodecName} for video file object {FileObjectId}",
                        subtitleStream.CodecName,
                        sourceFileObject.Id);
                    continue;
                }

                string subtitleFileName = BuildSubtitleFileName(subtitleStream, subtitlePlan.Value.extension);
                string subtitleOutputPath = Path.Combine(subtitlesDirectory, subtitleFileName);

                bool subtitleSuccess = subtitlePlan.Value.variant == FileObjectVariant.SubtitleSup
                    ? await mediaFFmpegService.ExtractPgsSubtitleToSupAsync(sourcePath, subtitleStream.Index, subtitleOutputPath, cancellationToken)
                    : await mediaFFmpegService.ExtractTextSubtitleToVttAsync(sourcePath, subtitleStream.Index, subtitleOutputPath, cancellationToken);


                if (!subtitleSuccess || !File.Exists(subtitleOutputPath))
                {
                    logger.LogWarning(
                        "Failed to extract subtitle stream {StreamIndex} for video file object {FileObjectId}",
                        subtitleStream.Index,
                        sourceFileObject.Id);
                    continue;
                }

                await PersistGeneratedAssetAsync(
                    subtitleOutputPath,
                    sourceFileObject,
                    subtitleStream,
                    subtitlePlan.Value.variant,
                    mimeType: subtitlePlan.Value.mimeType,
                    assetsFolder: MediaFolderOptions.AssetsVideoSubtitle,
                    assetsService,
                    hashService,
                    dbContext,
                    cancellationToken);
            }

            ProbeStream? attachedPictureStream = probeResult.Streams?
                .Where(stream => string.Equals(stream.CodecType, "video", StringComparison.OrdinalIgnoreCase))
                .Where(stream => stream.Disposition?.AttachedPic == 1)
                .OrderBy(stream => stream.Index)
                .FirstOrDefault();

            if (attachedPictureStream is not null)
            {
                (string AttachedExtension, string AttachedMimeType) = GetAttachedPictureFormat(attachedPictureStream);
                string attachedPictureFileName = $"{Path.GetFileNameWithoutExtension(sourceFileObject.OriginalFileName)}_attached_picture.{AttachedExtension}";
                string attachedPictureOutputPath = Path.Combine(artworkDirectory, attachedPictureFileName);

                bool attachedPictureSuccess = await mediaFFmpegService.ExtractAttachedPictureAsync(
                    sourcePath,
                    attachedPictureStream.Index,
                    attachedPictureOutputPath,
                    cancellationToken);

                if (!attachedPictureSuccess || !File.Exists(attachedPictureOutputPath))
                {
                    logger.LogWarning(
                        "Failed to extract attached picture stream {StreamIndex} for video file object {FileObjectId}",
                        attachedPictureStream.Index,
                        sourceFileObject.Id);
                }
                else
                {
                    await PersistGeneratedAssetAsync(
                        attachedPictureOutputPath,
                        sourceFileObject,
                        attachedPictureStream,
                        FileObjectVariant.AttachedPicture,
                        mimeType: AttachedMimeType,
                        assetsFolder: MediaFolderOptions.AssetsVideoArtwork,
                        assetsService,
                        hashService,
                        dbContext,
                        cancellationToken);
                }
            }
            else
            {
                string thumbnailFileName = $"{Path.GetFileNameWithoutExtension(sourceFileObject.OriginalFileName)}_thumbnail.jpg";
                string thumbnailOutputPath = Path.Combine(artworkDirectory, thumbnailFileName);
                double? thumbnailSeekSeconds = GetThumbnailSeekSeconds(probeResult.Format?.Duration);

                bool thumbnailSuccess = await mediaFFmpegService.ExtractVideoThumbnailAsync(
                    sourcePath,
                    videoStream.Index,
                    thumbnailOutputPath,
                    thumbnailSeekSeconds,
                    cancellationToken);

                if (!thumbnailSuccess || !File.Exists(thumbnailOutputPath))
                {
                    logger.LogWarning(
                        "Failed to generate thumbnail from video stream {StreamIndex} for video file object {FileObjectId}",
                        videoStream.Index,
                        sourceFileObject.Id);
                }
                else
                {
                    await PersistGeneratedAssetAsync(
                        thumbnailOutputPath,
                        sourceFileObject,
                        videoStream,
                        FileObjectVariant.Thumbnail640x360,
                        mimeType: "image/jpeg",
                        assetsFolder: MediaFolderOptions.AssetsVideoArtwork,
                        assetsService,
                        hashService,
                        dbContext,
                        cancellationToken,
                        fileObjectType: FileObjectType.Thumbnail);
                }
            }

            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to persist failure state for DASH file object {FileObjectId}", sourceFileObject.Id);
            throw;
        }
        finally
        {
            TryDeleteTempFile(sourcePath, logger);
            TryDeleteTempDirectory(outputDirectory, logger);
        }
    }

    private enum ConcertDashKind
    {
        PackageMp4,
        PackageWebM,
        TranscodeAv1WebM,
    }

    private const int ConcertConvertToAv1BitrateThreshold = 10_000_000;

    private sealed record ConcertDashPlan(
        ConcertDashKind Kind,
        string Container);

    private static ConcertDashPlan GetConcertDashPlan(
        ProbeStream videoStream,
        IReadOnlyList<ProbeStream> audioStreams,
        int? videoBitrate)
    {
        IEnumerable<string?> audioCodecs = audioStreams.Select(stream => stream.CodecName);

        if (videoBitrate is not null && videoBitrate > ConcertConvertToAv1BitrateThreshold)
        {
            return new(ConcertDashKind.TranscodeAv1WebM, "webm");
        }

        if (MediaFiles.CanRemuxVideoToMp4(videoStream.CodecName, audioCodecs))
        {
            return new(ConcertDashKind.PackageMp4, "mp4");
        }

        if (MediaFiles.CanRemuxVideoToWebM(videoStream.CodecName, audioCodecs))
        {
            return new(ConcertDashKind.PackageWebM, "webm");
        }

        return new(ConcertDashKind.TranscodeAv1WebM, "webm");
    }

    private static double? GetThumbnailSeekSeconds(double? durationSeconds)
    {
        if (durationSeconds is null || durationSeconds <= 0)
        {
            return 30;
        }

        return Math.Clamp(durationSeconds.Value * 0.1, 30, 300);
    }

    private static (string extension, string mimeType) GetAttachedPictureFormat(ProbeStream attachedPictureStream)
    {
        string? mimeType = GetStreamTag(attachedPictureStream, "mimetype");
        if (!string.IsNullOrWhiteSpace(mimeType))
        {
            return mimeType switch
            {
                "image/png" => ("png", "image/png"),
                _ => ("jpg", "image/jpeg")
            };
        }

        return string.Equals(attachedPictureStream.CodecName, "png", StringComparison.OrdinalIgnoreCase)
            ? ("png", "image/png")
            : ("jpg", "image/jpeg");
    }


    private static async Task PersistGeneratedAssetAsync(
        string assetPath,
        FileObject sourceFileObject,
        ProbeStream stream,
        FileObjectVariant variant,
        string mimeType,
        MediaFolderOptions assetsFolder,
        IAssetsService assetsService,
        IHashService hashService,
        AppDbContext dbContext,
        CancellationToken cancellationToken,
        FileObjectType fileObjectType = FileObjectType.GeneratedAsset)
    {
        string hash = await hashService.ComputeBlake3HashAsync(assetPath, cancellationToken);
        string fileName = Path.GetFileName(assetPath);
        string storagePath = assetsService.GetStoragePath(assetsFolder, hash, mimeType, fileName);

        await assetsService.UploadFileFromTempAsync(storagePath, assetPath, cancellationToken);

        FileObject assetFileObject = new()
        {
            FileId = sourceFileObject.FileId,
            FileObjectVariant = variant,
            StoragePath = storagePath,
            OriginalBlake3Hash = hash,
            CurrentBlake3Hash = hash,
            Type = fileObjectType,
            SizeInBytes = new FileInfo(assetPath).Length,
            MimeType = mimeType,
            Container = mimeType,
            Extension = Path.GetExtension(assetPath).TrimStart('.'),
            Codec = string.IsNullOrWhiteSpace(stream.CodecName) ? null : stream.CodecName.ToUpperInvariant(),
            Width = stream.Width,
            Height = stream.Height,
            DurationInMs = sourceFileObject.DurationInMs,
            OriginalFileName = fileName,
            CreatedByUserId = sourceFileObject.CreatedByUserId,
            ProcessingStatus = FileProcessingStatus.Completed,
        };

        dbContext.FileObjects.Add(assetFileObject);
    }

    private static string BuildSubtitleFileName(ProbeStream subtitleStream, string extension)
    {
        string language = GetStreamTag(subtitleStream, "language") ?? "und";
        string suffix = $"stream-{subtitleStream.Index}";

        return $"{language}_{suffix}.{extension}";
    }

    private static string? GetStreamTag(ProbeStream stream, string key)
    {
        if (stream.Tags is null)
        {
            return null;
        }

        foreach ((string tagKey, string value) in stream.Tags)
        {
            if (string.Equals(tagKey, key, StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return null;
    }


    private static (string extension, string mimeType, FileObjectVariant variant)? GetSubtitleExtractionPlan(string? codecName)
    {
        string normalizedCodec = (codecName ?? string.Empty).Trim().ToLowerInvariant();

        if (normalizedCodec == "hdmv_pgs_subtitle")
        {
            return ("sup", "application/x-pgs", FileObjectVariant.SubtitleSup);
        }

        if (normalizedCodec is "webvtt" or "subrip" or "srt" or "ass" or "ssa" or "mov_text" or "text")
        {
            return ("vtt", "text/vtt", FileObjectVariant.SubtitleVtt);
        }

        return null;
    }

    private static long GetDirectorySizeInBytes(string sourceDirectory)
    {
        return Directory.EnumerateFiles(sourceDirectory, "*", SearchOption.AllDirectories)
            .Sum(path => new FileInfo(path).Length);
    }

    private static async Task UploadDirectoryAsync(
        IContentService contentService,
        string sourceDirectory,
        string destinationRoot,
        CancellationToken cancellationToken)
    {
        foreach (string filePath in Directory.EnumerateFiles(sourceDirectory, "*", SearchOption.AllDirectories))
        {
            string relativePath = Path.GetRelativePath(sourceDirectory, filePath).Replace('\\', '/');
            string objectPath = $"{destinationRoot.TrimEnd('/')}/{relativePath}";
            await contentService.UploadFileFromTempAsync(objectPath, filePath, cancellationToken);
        }
    }

    private static async Task ProcessPartyExternalEnrichmentAsync(
        PartyInfoEnrichmentWorkerModel job,
        IServiceScopeFactory scopeFactory,
        CancellationToken cancellationToken)
    {
        using IServiceScope scope = scopeFactory.CreateScope();
        IPartyExternalEnrichmentService partyExternalEnrichmentService =
            scope.ServiceProvider.GetRequiredService<IPartyExternalEnrichmentService>();

        await partyExternalEnrichmentService.EnrichPartyAsync(job.PartyId, cancellationToken);
    }


    private static async Task ProcessTrackUploadAsync(
        TrackUploadProcessWorkerModel job,
        IServiceScopeFactory scopeFactory,
        ILogger<BackgroundWorker> logger,
        CancellationToken cancellationToken)
    {
        string? filePath = null;
        string? newPath = null;
        string? waveformPath = null;

        using IServiceScope scope = scopeFactory.CreateScope();
        IContentService contentService = scope.ServiceProvider.GetRequiredService<IContentService>();
        IAssetsService assetsService = scope.ServiceProvider.GetRequiredService<IAssetsService>();
        AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        IMediaProbeService mediaProbeService = scope.ServiceProvider.GetRequiredService<IMediaProbeService>();
        IMediaFFmpegService mediaFFmpegService = scope.ServiceProvider.GetRequiredService<IMediaFFmpegService>();
        IHashService hashService = scope.ServiceProvider.GetRequiredService<IHashService>();
        IWaveformService waveformService = scope.ServiceProvider.GetRequiredService<IWaveformService>();

        StorageOptions storageOptions = scope.ServiceProvider
            .GetRequiredService<IOptions<StorageOptions>>()
            .Value;

        string tempDir = storageOptions.TempDir;

        FileObject fileObject = await dbContext.FileObjects.FirstOrDefaultAsync(
            fo => fo.Id == job.FileObjectId, cancellationToken)
            ?? throw new EntityNotFoundException($"File object with ID {job.FileObjectId} not found."
        );

        try
        {
            string fileName = $"track_{fileObject.Id}.{fileObject.Extension}";
            filePath = Path.Combine(tempDir, fileName);

            await contentService.DownloadFileToTemp(
                fileObject.StoragePath,
                filePath,
                cancellationToken);

            MediaProbeResult? probeResult = await mediaProbeService.ProbeAsync(filePath);

            int bitRate = probeResult?.Format?.BitRate ?? fileObject.Bitrate ?? 0;

            if (bitRate == 0)
            {
                throw new InvalidOperationException($"Unable to determine bitrate for file object ID {fileObject.Id}.");
            }

            waveformPath = Path.Combine(tempDir, $"{fileName}_waveform.json");

            bool waveformSuccess = await waveformService.GenerateWaveformJsonAsync(filePath, waveformPath);

            if (waveformSuccess)
            {
                string waveformStoragePath = contentService.GetWaveformStoragePath(fileObject.FileId);

                await assetsService.UploadFileFromTempAsync(waveformStoragePath, waveformPath, cancellationToken);

                string waveformHash = await hashService.ComputeBlake3HashAsync(waveformPath, cancellationToken);

                FileObject waveformFileObject = new()
                {
                    FileId = fileObject.FileId,
                    FileObjectVariant = FileObjectVariant.WaveformB8Pixel20,
                    StoragePath = waveformStoragePath,
                    OriginalBlake3Hash = waveformHash,
                    CurrentBlake3Hash = waveformHash,
                    Type = FileObjectType.GeneratedAsset,
                    SizeInBytes = new FileInfo(waveformPath).Length,
                    MimeType = "application/json",
                    Container = "application/json",
                    Extension = "json",
                    OriginalFileName = $"{fileObject.OriginalFileName}.{DateTime.UtcNow}.waveform.json",
                    ProcessingStatus = FileProcessingStatus.Completed
                };

                dbContext.FileObjects.Add(waveformFileObject);
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            if (!MediaFiles.ShouldTranscodeToOpus96(bitRate))
            {
                return;
            }

            newPath = Path.Combine(tempDir, $"{fileName}_opus.opus");

            bool success = await mediaFFmpegService.ConvertToOpusAsync(filePath, newPath);

            if (!success)
            {
                throw new InvalidOperationException($"FFmpeg failed to convert file object ID {fileObject.Id} to Opus.");
            }

            string newHash = await hashService.ComputeBlake3HashAsync(newPath, cancellationToken);

            string newStoragePath = contentService.GetStoragePath(
                MediaFolderOptions.DerivedMusic,
                newHash,
                "audio/opus");

            MediaProbeResult? newProbeResult = await mediaProbeService.ProbeAsync(newPath);

            ProbeStream? audioStream = newProbeResult?.Streams?.FirstOrDefault(s => s.CodecType == "audio");

            if (newProbeResult is null)
            {
                logger.LogWarning("ffprobe returned no metadata for transcoded file {FilePath}", newPath);
            }

            if (audioStream is null)
            {
                logger.LogWarning("No audio stream found for transcoded file {FilePath}", newPath);
            }


            FileObject newFileObject = new()
            {
                FileId = fileObject.FileId,
                FileObjectVariant = FileObjectVariant.Opus96,
                StoragePath = newStoragePath,
                OriginalBlake3Hash = newHash,
                CurrentBlake3Hash = newHash,
                Type = FileObjectType.Transcoded,
                SizeInBytes = new FileInfo(newPath).Length,
                MimeType = "audio/opus",
                Container = "audio/opus",
                Extension = "opus",
                Codec = "OPUS",
                AudioSampleRate = audioStream?.SampleRate,
                Bitrate = newProbeResult?.Format?.BitRate,
                DurationInMs = audioStream?.Duration != null
                    ? (int)(audioStream.Duration * 1000) : fileObject.DurationInMs,
                OriginalFileName = $"{fileObject.OriginalFileName}.{DateTime.UtcNow}.opus",
                ProcessingStatus = FileProcessingStatus.Completed
            };

            await contentService.UploadFileFromTempAsync(newStoragePath, newPath, cancellationToken);

            dbContext.FileObjects.Add(newFileObject);

            await dbContext.SaveChangesAsync(cancellationToken);
        }
        finally
        {
            TryDeleteTempFile(filePath, logger);
            TryDeleteTempFile(newPath, logger);
            TryDeleteTempFile(waveformPath, logger);
        }
    }

    private static void TryDeleteTempFile(string? path, ILogger<BackgroundWorker> logger)
    {
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            return;
        }

        try
        {
            File.Delete(path);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to delete temporary file {FilePath}", path);
        }
    }

    private static void TryDeleteTempDirectory(string? path, ILogger<BackgroundWorker> logger)
    {
        if (string.IsNullOrWhiteSpace(path) || !Directory.Exists(path))
        {
            return;
        }

        try
        {
            Directory.Delete(path, recursive: true);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to delete temporary directory {DirectoryPath}", path);
        }
    }
}
