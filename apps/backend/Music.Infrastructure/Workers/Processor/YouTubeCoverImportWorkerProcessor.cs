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
using Music.Core.Services.Files.Requests;
using Music.Core.Storage;
using Music.Core.Workers;
using Music.Infrastructure.Data;
using Music.Infrastructure.Services.YouTube;
using Music.Infrastructure.Utils;
using SixLabors.ImageSharp;

namespace Music.Infrastructure.Workers.Processor;

class YouTubeCoverImportWorkerProcessor(
    AppDbContext dbContext,
    IContentService contentService,
    IAssetsService assetsService,
    IMediaProbeService mediaProbeService,
    IHashService hashService,
    IBackgroundTaskQueue backgroundTaskQueue,
    IHttpClientFactory httpClientFactory,
    ImageUploadWorkerProcessor imageUploadWorkerProcessor,
    IOptions<StorageOptions> storageOptions,
    IOptions<ExternalOptions> externalOptions,
    ILogger<YouTubeCoverImportWorkerProcessor> logger
)
{
    private const int MaxDownloadAttempts = 3;

    private static readonly HashSet<string> LosslessCodecs = new(StringComparer.OrdinalIgnoreCase)
    {
        "flac",
        "alac",
        "wavpack",
        "ape",
        "tta",
    };

    public async Task ProcessAsync(YouTubeCoverImportWorker job, CancellationToken cancellationToken)
    {
        Track track =
            await dbContext
                .Tracks.AsSplitQuery()
                .Include(t => t.Audios)
                    .ThenInclude(audio => audio.File)
                        .ThenInclude(file => file!.FileObjects)
                .Include(t => t.AlbumTracks)
                    .ThenInclude(albumTrack => albumTrack.AlbumDisc)
                        .ThenInclude(disc => disc!.Album)
                            .ThenInclude(album => album!.Images)
                                .ThenInclude(image => image.File)
                                    .ThenInclude(file => file!.FileObjects)
                .FirstOrDefaultAsync(t => t.Id == job.TrackId, cancellationToken)
            ?? throw new EntityNotFoundException($"Track {job.TrackId} not found.");

        Album album =
            track.AlbumTracks.Select(albumTrack => albumTrack.AlbumDisc?.Album).FirstOrDefault()
            ?? throw new EntityNotFoundException($"Album for track {job.TrackId} not found.");

        string tempDir = Path.Combine(
            storageOptions.Value.TempDir,
            $"youtube_{track.Id}_{Guid.NewGuid():N}"
        );
        Directory.CreateDirectory(tempDir);

        try
        {
            // Cover goes first so the track worker can embed the cropped cover in the tags
            if (job.ThumbnailUrl is not null)
            {
                await ImportCoverAsync(job, album, tempDir, cancellationToken);
            }

            FileObject audioFileObject = await ImportAudioAsync(
                job,
                track,
                tempDir,
                cancellationToken
            );

            if (audioFileObject.ProcessingStatus != FileProcessingStatus.Completed)
            {
                await backgroundTaskQueue.QueueWorkerAsync(
                    new TrackUploadProcessWorker { FileObjectId = audioFileObject.Id },
                    cancellationToken
                );
            }
        }
        finally
        {
            WorkerFileOperations.TryDeleteTempDirectory(tempDir, logger);
        }
    }

    private async Task<FileObject> ImportAudioAsync(
        YouTubeCoverImportWorker job,
        Track track,
        string tempDir,
        CancellationToken cancellationToken
    )
    {
        FileObject? existing = track
            .Audios.Select(audio => audio.File)
            .SelectMany(file => file?.FileObjects ?? [])
            .FirstOrDefault(fileObject => fileObject.FileObjectVariant == FileObjectVariant.Original);

        if (existing is not null && existing.ProcessingStatus != FileProcessingStatus.Pending)
        {
            logger.LogInformation(
                "Skipping YouTube audio download for track {TrackId}; audio already imported",
                track.Id
            );
            return existing;
        }

        logger.LogInformation(
            "Downloading best audio for track {TrackId} from {Url}",
            track.Id,
            job.Url
        );

        string audioPath = await DownloadAudioAsync(job.Url, tempDir, cancellationToken);

        MediaProbeResult probe =
            await mediaProbeService.ProbeAsync(audioPath, cancellationToken)
            ?? throw new InvalidOperationException("ffprobe returned no metadata for the audio.");

        ProbeStream audioStream =
            ProbeHelper.GetAudioStreams(probe).FirstOrDefault()
            ?? throw new InvalidOperationException("Downloaded file has no audio stream.");

        string extension = Path.GetExtension(audioPath).TrimStart('.').ToLowerInvariant();
        string mimeType = MediaFiles.GetMimeTypeFromExtension(extension);
        string hash = await hashService.ComputeBlake3HashAsync(audioPath, cancellationToken);
        double? durationInSeconds = probe.Format?.Duration ?? audioStream.Duration;
        int? durationInMs = durationInSeconds is double seconds
            ? (int)Math.Round(seconds * 1000)
            : null;

        FileRequest fileRequest = new()
        {
            Blake3Hash = hash,
            MimeType = mimeType,
            SizeInBytes = new FileInfo(audioPath).Length,
            Container = probe.Format?.FormatName?.Split(',')[0] ?? extension,
            Extension = extension,
            Codec = audioStream.CodecName,
            Lossless = audioStream.CodecName is string codec
                && (LosslessCodecs.Contains(codec) || codec.StartsWith("pcm_")),
            AudioChannels = audioStream.Channels,
            AudioSampleRate = audioStream.SampleRate,
            Bitrate = MediaFiles.GetBestAvailableBitrate(audioStream, probe.Format),
            DurationInMs = durationInMs,
            OriginalFileName = $"{SanitizeFileName(track.Title)}.{extension}",
        };

        string storagePath = contentService.GetStoragePath(
            MediaFolderOptions.OriginalMusic,
            hash,
            mimeType
        );

        await contentService.UploadFileFromTempAsync(
            storagePath,
            audioPath,
            mimeType,
            cancellationToken
        );

        (StoredFile storedFile, FileObject fileObject) = contentService.CreateStoredFileWithObject(
            fileRequest,
            FileType.Audio,
            storagePath,
            StorageArea.Content,
            FileObjectVariant.Original,
            job.UserId,
            MediaSource.YouTube,
            job.Url
        );

        fileObject.ProcessingStatus = FileProcessingStatus.Uploaded;

        dbContext.StoredFiles.Add(storedFile);
        dbContext.FileObjects.Add(fileObject);
        dbContext.TrackAudios.Add(
            new TrackAudio
            {
                Track = track,
                File = storedFile,
                UploadedByUserId = job.UserId,
            }
        );

        if (durationInMs is int probedDuration)
            track.DurationInMs = probedDuration;

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Imported YouTube audio for track {TrackId}: {Codec} {SizeInBytes} bytes at {StoragePath}",
            track.Id,
            fileRequest.Codec,
            fileRequest.SizeInBytes,
            storagePath
        );

        return fileObject;
    }

    // YouTube returns sporadic 403s on media URLs, a fresh yt-dlp run gets new ones
    private async Task<string> DownloadAudioAsync(
        string url,
        string tempDir,
        CancellationToken cancellationToken
    )
    {
        for (int attempt = 1; attempt <= MaxDownloadAttempts; attempt++)
        {
            // -x without re-encoding keeps the source codec, only remuxes (webm/opus -> .opus)
            (bool success, string stdout) = await ExternalRunner.RunWithOutputAsync(
                logger,
                externalOptions.Value.YtDlpPath,
                [
                    "--format",
                    "bestaudio/best",
                    "--no-playlist",
                    "--no-warnings",
                    "--no-progress",
                    "--extract-audio",
                    "--audio-format",
                    "best",
                    "--output",
                    Path.Combine(tempDir, "audio.%(ext)s"),
                    "--print",
                    "after_move:filepath",
                    "--",
                    url,
                ],
                url,
                tempDir,
                "yt-dlp",
                cancellationToken
            );

            string? audioPath = stdout
                .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .LastOrDefault();

            if (success && audioPath is not null && File.Exists(audioPath))
                return audioPath;

            logger.LogWarning(
                "yt-dlp attempt {Attempt}/{MaxAttempts} failed for {Url}",
                attempt,
                MaxDownloadAttempts,
                url
            );

            if (attempt < MaxDownloadAttempts)
                await Task.Delay(TimeSpan.FromSeconds(2 * attempt), cancellationToken);
        }

        throw new InvalidOperationException($"yt-dlp failed to download audio for {url}.");
    }

    private async Task ImportCoverAsync(
        YouTubeCoverImportWorker job,
        Album album,
        string tempDir,
        CancellationToken cancellationToken
    )
    {
        FileObject? existing = album
            .Images.Select(image => image.File)
            .SelectMany(file => file?.FileObjects ?? [])
            .FirstOrDefault(fileObject => fileObject.FileObjectVariant == FileObjectVariant.Original);

        if (existing is null)
        {
            existing = await DownloadCoverAsync(job, album, tempDir, cancellationToken);
        }

        if (existing.ProcessingStatus == FileProcessingStatus.Completed)
            return;

        await imageUploadWorkerProcessor.ProcessAsync(
            new ImageUploadProcessWorker { FileObjectId = existing.Id },
            cancellationToken
        );
    }

    private async Task<FileObject> DownloadCoverAsync(
        YouTubeCoverImportWorker job,
        Album album,
        string tempDir,
        CancellationToken cancellationToken
    )
    {
        if (!YouTubeService.IsYouTubeThumbnailUrl(job.ThumbnailUrl!))
            throw new InvalidOperationException("Thumbnail must be a YouTube thumbnail URL.");

        HttpClient httpClient = httpClientFactory.CreateClient();
        using HttpResponseMessage response = await httpClient.GetAsync(
            job.ThumbnailUrl,
            cancellationToken
        );
        response.EnsureSuccessStatusCode();

        string mimeType =
            response.Content.Headers.ContentType?.MediaType
            ?? MediaFiles.GetMimeTypeFromExtension(Path.GetExtension(job.ThumbnailUrl!));
        string extension = MediaFiles.GetExtensionFromMimeType(mimeType, string.Empty);

        if (string.IsNullOrEmpty(extension) || !mimeType.StartsWith("image/"))
            throw new InvalidOperationException($"Unsupported thumbnail type {mimeType}.");

        string coverPath = Path.Combine(tempDir, $"cover.{extension}");

        await using (FileStream output = File.Create(coverPath))
        {
            await response.Content.CopyToAsync(output, cancellationToken);
        }

        ImageInfo imageInfo = await Image.IdentifyAsync(coverPath, cancellationToken);
        string hash = await hashService.ComputeBlake3HashAsync(coverPath, cancellationToken);

        FileRequest fileRequest = new()
        {
            Blake3Hash = hash,
            MimeType = mimeType,
            SizeInBytes = new FileInfo(coverPath).Length,
            Container = extension,
            Extension = extension,
            Width = imageInfo.Width,
            Height = imageInfo.Height,
            OriginalFileName = $"{SanitizeFileName(album.Title)}.{extension}",
        };

        string storagePath = assetsService.GetStoragePath(
            MediaFolderOptions.AssetsCover,
            hash,
            mimeType
        );

        await assetsService.UploadFileFromTempAsync(
            storagePath,
            coverPath,
            mimeType,
            cancellationToken
        );

        (StoredFile storedFile, FileObject fileObject) = assetsService.CreateStoredFileWithObject(
            fileRequest,
            FileType.Image,
            storagePath,
            StorageArea.Assets,
            FileObjectVariant.Original,
            job.UserId,
            MediaSource.YouTube,
            job.ThumbnailUrl
        );

        fileObject.ProcessingStatus = FileProcessingStatus.Uploaded;

        dbContext.StoredFiles.Add(storedFile);
        dbContext.FileObjects.Add(fileObject);
        dbContext.AlbumImages.Add(
            new AlbumImage
            {
                Album = album,
                File = storedFile,
                IsPrimary = true,
                CropX = job.CroppedArea?.X,
                CropY = job.CroppedArea?.Y,
                CropWidth = job.CroppedArea?.Width,
                CropHeight = job.CroppedArea?.Height,
            }
        );

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Imported YouTube thumbnail for album {AlbumId}: {Width}x{Height} at {StoragePath}",
            album.Id,
            imageInfo.Width,
            imageInfo.Height,
            storagePath
        );

        return fileObject;
    }

    private static string SanitizeFileName(string value)
    {
        char[] invalidFileNameChars = Path.GetInvalidFileNameChars();
        return string.Concat(value.Select(ch => invalidFileNameChars.Contains(ch) ? '_' : ch));
    }
}
