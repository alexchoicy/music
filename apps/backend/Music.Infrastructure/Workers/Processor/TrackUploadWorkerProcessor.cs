using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Music.Core.Common.Enums;
using Music.Core.Common.Exceptions;
using Music.Core.Common.Utils;
using Music.Core.Entities;
using Music.Core.Media;
using Music.Core.Media.FFmpeg;
using Music.Core.Options;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Images.Enums;
using Music.Core.Storage;
using Music.Core.Workers;
using Music.Infrastructure.Data;
using Music.Infrastructure.Services.Media;

namespace Music.Infrastructure.Workers.Processor;

public class TrackUploadWorkerProcessor(
    IContentService contentService,
    IAssetsService assetsService,
    AppDbContext dbContext,
    IMediaProbeService mediaProbeService,
    IFFmpegService mediaFFmpegService,
    IHashService hashService,
    IWaveformService waveformService,
    IOptions<StorageOptions> storageOptions,
    ILogger<TrackUploadWorkerProcessor> logger
)
{
    public async Task ProcessAsync(
        TrackUploadProcessWorker job,
        CancellationToken cancellationToken
    )
    {
        string? filePath = null;
        string? coverPath = null;
        string? taggedPath = null;
        string? newPath = null;
        string? waveformPath = null;
        string? tempDir = null;

        FileObject fileObject =
            await dbContext
                .FileObjects.AsSplitQuery()
                .Include(fo => fo.File)
                    .ThenInclude(file => file!.FileObjects)
                .Include(fo => fo.File)
                    .ThenInclude(file => file!.TrackAudios)
                        .ThenInclude(audio => audio.Track)
                            .ThenInclude(track => track!.Credits)
                                .ThenInclude(credit => credit.Party)
                .Include(fo => fo.File)
                    .ThenInclude(file => file!.TrackAudios)
                        .ThenInclude(audio => audio.Track)
                            .ThenInclude(track => track!.AlbumTracks)
                                .ThenInclude(albumTrack => albumTrack.AlbumDisc)
                                    .ThenInclude(disc => disc!.Album)
                                        .ThenInclude(album => album!.Credits)
                                            .ThenInclude(credit => credit.Party)
                .Include(fo => fo.File)
                    .ThenInclude(file => file!.TrackAudios)
                        .ThenInclude(audio => audio.Track)
                            .ThenInclude(track => track!.AlbumTracks)
                                .ThenInclude(albumTrack => albumTrack.AlbumDisc)
                                    .ThenInclude(disc => disc!.Album)
                                        .ThenInclude(album => album!.Images)
                                            .ThenInclude(image => image.File)
                                                .ThenInclude(file => file!.FileObjects)
                .FirstOrDefaultAsync(fo => fo.Id == job.FileObjectId, cancellationToken)
            ?? throw new EntityNotFoundException(
                $"File object with ID {job.FileObjectId} not found."
            );

        fileObject.ProcessingStatus = FileProcessingStatus.Processing;
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            tempDir = Path.Combine(
                storageOptions.Value.TempDir,
                $"track_{fileObject.Id}_{Guid.NewGuid():N}"
            );
            Directory.CreateDirectory(tempDir);

            string fileName = $"track_{fileObject.Id}.{fileObject.Extension}";
            filePath = Path.Combine(tempDir, fileName);

            logger.LogInformation(
                "Processing track upload {FileObjectId}: temp source {SourcePath}, temp directory {TempDirectory}",
                fileObject.Id,
                filePath,
                tempDir
            );

            logger.LogInformation(
                "Downloading track source {FileObjectId} from {StoragePath} to {SourcePath}",
                fileObject.Id,
                fileObject.StoragePath,
                filePath
            );

            await contentService.DownloadFileToTemp(
                fileObject.StoragePath,
                filePath,
                cancellationToken
            );

            logger.LogInformation(
                "Downloaded track source {FileObjectId}: {SizeInBytes} bytes",
                fileObject.Id,
                new FileInfo(filePath).Length
            );

            logger.LogInformation(
                "Building audio metadata for track file object {FileObjectId}",
                fileObject.Id
            );
            AudioMetadataModel metadata = BuildAudioMetadata(fileObject);

            logger.LogInformation(
                "Built audio metadata for track file object {FileObjectId}: title {Title}, album {Album}, artists {Artists}",
                fileObject.Id,
                metadata.Title,
                metadata.Album,
                string.Join(", ", metadata.Artists)
            );

            (coverPath, string? mimeType) = await TryDownloadAlbumCoverAsync(
                fileObject,
                tempDir,
                cancellationToken
            );

            taggedPath = Path.Combine(
                tempDir,
                $"{Path.GetFileNameWithoutExtension(fileName)}_tagged.{fileObject.Extension}"
            );

            await CreateTaggedOriginalAsync(
                fileObject,
                filePath,
                taggedPath,
                metadata,
                coverPath,
                mimeType,
                cancellationToken
            );

            waveformPath = Path.Combine(tempDir, $"{fileName}_waveform.json");
            await GenerateWaveformAsync(fileObject, filePath, waveformPath, cancellationToken);

            if (fileObject.Lossless)
            {
                newPath = Path.Combine(tempDir, $"{fileName}_opus.opus");
                await TranscodeToOpusAsync(
                    fileObject,
                    filePath,
                    newPath,
                    metadata,
                    coverPath,
                    mimeType,
                    cancellationToken
                );
            }
            else
            {
                logger.LogInformation(
                    "Skipping Opus transcode for lossy track file object {FileObjectId}",
                    fileObject.Id
                );
            }
            fileObject.ProcessingStatus = FileProcessingStatus.Completed;
            await dbContext.SaveChangesAsync(cancellationToken);

            logger.LogInformation(
                "Completed track upload processing for file object {FileObjectId}",
                fileObject.Id
            );
        }
        finally
        {
            WorkerFileOperations.TryDeleteTempFile(filePath, logger);
            WorkerFileOperations.TryDeleteTempFile(coverPath, logger);
            WorkerFileOperations.TryDeleteTempFile(taggedPath, logger);
            WorkerFileOperations.TryDeleteTempFile(newPath, logger);
            WorkerFileOperations.TryDeleteTempFile(waveformPath, logger);
            WorkerFileOperations.TryDeleteTempDirectory(tempDir, logger);
        }
    }

    private async Task GenerateWaveformAsync(
        FileObject fileObject,
        string filePath,
        string waveformPath,
        CancellationToken cancellationToken
    )
    {
        if (
            fileObject.File?.FileObjects.Any(fo =>
                fo.FileObjectVariant == FileObjectVariant.WaveformB8Pixel20
            ) == true
        )
        {
            logger.LogInformation(
                "Skipping waveform generation for track file object {FileObjectId}; waveform already exists",
                fileObject.Id
            );
            return;
        }

        logger.LogInformation(
            "Generating waveform for track file object {FileObjectId} at {OutputPath}",
            fileObject.Id,
            waveformPath
        );

        bool waveformSuccess = await waveformService.GenerateWaveformJsonAsync(
            filePath,
            waveformPath,
            cancellationToken
        );

        if (!waveformSuccess)
        {
            logger.LogWarning(
                "Unable to generate waveform for track file object {FileObjectId}",
                fileObject.Id
            );
            return;
        }

        string waveformStoragePath = assetsService.GetWaveformStoragePath(fileObject.FileId);

        string waveformHash = await hashService.ComputeBlake3HashAsync(
            waveformPath,
            cancellationToken
        );

        FileObject waveformFileObject = new()
        {
            FileId = fileObject.FileId,
            FileObjectVariant = FileObjectVariant.WaveformB8Pixel20,
            StorageArea = StorageArea.Assets,
            StoragePath = waveformStoragePath,
            ObjectBlake3Hash = waveformHash,
            SizeInBytes = new FileInfo(waveformPath).Length,
            MimeType = "application/json",
            Container = "json",
            Extension = "json",
            Lossless = false,
            ProcessingStatus = FileProcessingStatus.Completed,
        };

        logger.LogInformation(
            "Uploading waveform for track file object {FileObjectId} to {StoragePath}",
            fileObject.Id,
            waveformStoragePath
        );

        await assetsService.UploadFileFromTempAsync(
            waveformStoragePath,
            waveformPath,
            waveformFileObject.MimeType,
            cancellationToken
        );

        logger.LogInformation(
            "Uploaded waveform for track file object {FileObjectId}: {SizeInBytes} bytes",
            fileObject.Id,
            waveformFileObject.SizeInBytes
        );

        dbContext.FileObjects.Add(waveformFileObject);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task CreateTaggedOriginalAsync(
        FileObject fileObject,
        string sourcePath,
        string taggedPath,
        AudioMetadataModel metadata,
        string? coverPath,
        string? mimetype,
        CancellationToken cancellationToken
    )
    {
        if (
            fileObject.File?.FileObjects.Any(fo =>
                fo.FileObjectVariant == FileObjectVariant.TaggedOriginal
            ) == true
        )
        {
            logger.LogInformation(
                "Skipping tagged original for track file object {FileObjectId}; tagged original already exists",
                fileObject.Id
            );
            return;
        }

        bool attemptedCoverArt;
        bool success;

        if (string.Equals(fileObject.Codec, "opus", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogInformation(
                "Writing Opus metadata for track file object {FileObjectId} to {TaggedPath}",
                fileObject.Id,
                taggedPath
            );

            string? coverImageBase64 = await FFmpegHelper.ConvertImageToBase64BlockImageAsync(
                coverPath,
                mimetype,
                cancellationToken
            );

            attemptedCoverArt = coverImageBase64 is not null;
            success = await mediaFFmpegService.WriteAudioMetadataAsync(
                sourcePath,
                taggedPath,
                metadata,
                null,
                coverImageBase64,
                cancellationToken
            );
        }
        else
        {
            logger.LogInformation(
                "Writing audio metadata for track file object {FileObjectId} to {TaggedPath}",
                fileObject.Id,
                taggedPath
            );

            attemptedCoverArt = coverPath is not null;
            success = await mediaFFmpegService.WriteAudioMetadataAsync(
                sourcePath,
                taggedPath,
                metadata,
                coverPath,
                null,
                cancellationToken
            );
        }

        if (!success && attemptedCoverArt)
        {
            logger.LogWarning(
                "Unable to embed cover art for file object {FileObjectId}; retrying metadata write without cover art",
                fileObject.Id
            );
            success = await mediaFFmpegService.WriteAudioMetadataAsync(
                sourcePath,
                taggedPath,
                metadata,
                null,
                null,
                cancellationToken
            );
        }

        if (!success)
        {
            logger.LogWarning(
                "Unable to write audio metadata for file object {FileObjectId}",
                fileObject.Id
            );
            return;
        }

        string taggedHash = await hashService.ComputeBlake3HashAsync(taggedPath, cancellationToken);

        string taggedStoragePath = contentService.GetStoragePath(
            MediaFolderOptions.DerivedMusic,
            taggedHash,
            fileObject.MimeType
        );

        FileObject taggedFileObject = new()
        {
            FileId = fileObject.FileId,
            FileObjectVariant = FileObjectVariant.TaggedOriginal,
            StorageArea = fileObject.StorageArea,
            StoragePath = taggedStoragePath,
            ObjectBlake3Hash = taggedHash,
            SizeInBytes = new FileInfo(taggedPath).Length,
            MimeType = fileObject.MimeType,
            Container = fileObject.Container,
            Extension = fileObject.Extension,
            Codec = fileObject.Codec,
            Lossless = fileObject.Lossless,
            AudioChannels = fileObject.AudioChannels,
            BitsPerSample = fileObject.BitsPerSample,
            Width = fileObject.Width,
            Height = fileObject.Height,
            AudioSampleRate = fileObject.AudioSampleRate,
            Bitrate = fileObject.Bitrate,
            FrameRate = fileObject.FrameRate,
            DurationInMs = fileObject.DurationInMs,
            ProcessingStatus = FileProcessingStatus.Completed,
        };

        logger.LogInformation(
            "Uploading tagged original for track file object {FileObjectId} to {StoragePath}",
            fileObject.Id,
            taggedStoragePath
        );

        await contentService.UploadFileFromTempAsync(
            taggedStoragePath,
            taggedPath,
            taggedFileObject.MimeType,
            cancellationToken
        );

        logger.LogInformation(
            "Uploaded tagged original for track file object {FileObjectId}: {SizeInBytes} bytes",
            fileObject.Id,
            taggedFileObject.SizeInBytes
        );

        dbContext.FileObjects.Add(taggedFileObject);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task TranscodeToOpusAsync(
        FileObject fileObject,
        string sourcePath,
        string outputPath,
        AudioMetadataModel metadata,
        string? coverPath,
        string? mimetype,
        CancellationToken cancellationToken
    )
    {
        if (
            fileObject.File?.FileObjects.Any(fo => fo.FileObjectVariant == FileObjectVariant.Opus96)
            == true
        )
        {
            logger.LogInformation(
                "Skipping Opus transcode for track file object {FileObjectId}; Opus variant already exists",
                fileObject.Id
            );
            return;
        }

        string? coverImageBase64 = await FFmpegHelper.ConvertImageToBase64BlockImageAsync(
            coverPath,
            mimetype,
            cancellationToken
        );

        int targetBitRate = FFmpegHelper.GetTargetOpusBitrateKbpsForAudio(
            fileObject.AudioChannels ?? 2
        );

        logger.LogInformation(
            "Transcoding track file object {FileObjectId} to Opus at {TargetBitRate} kbps: {OutputPath}",
            fileObject.Id,
            targetBitRate,
            outputPath
        );

        bool success = await mediaFFmpegService.ConvertToOpusAsync(
            sourcePath,
            outputPath,
            targetBitRate,
            metadata,
            coverImageBase64,
            cancellationToken
        );

        if (!success && coverImageBase64 is not null)
        {
            logger.LogWarning(
                "Unable to embed cover art for Opus file object {FileObjectId}; retrying Opus transcode without cover art",
                fileObject.Id
            );
            success = await mediaFFmpegService.ConvertToOpusAsync(
                sourcePath,
                outputPath,
                targetBitRate,
                metadata,
                null,
                cancellationToken
            );
        }

        if (!success)
        {
            throw new InvalidOperationException(
                $"FFmpeg failed to convert file object ID {fileObject.Id} to Opus."
            );
        }

        string newHash = await hashService.ComputeBlake3HashAsync(outputPath, cancellationToken);

        string newStoragePath = contentService.GetStoragePath(
            MediaFolderOptions.DerivedMusic,
            newHash,
            "audio/opus"
        );

        MediaProbeResult? newProbeResult = await mediaProbeService.ProbeAsync(
            outputPath,
            cancellationToken
        );
        ProbeStream? audioStream = newProbeResult?.Streams?.FirstOrDefault(s =>
            s.CodecType == "audio"
        );

        if (newProbeResult is null)
        {
            logger.LogWarning(
                "ffprobe returned no metadata for transcoded file {FilePath}",
                outputPath
            );
            return;
        }
        else if (audioStream is null)
        {
            logger.LogWarning("No audio stream found for transcoded file {FilePath}", outputPath);
            return;
        }

        FileObject newFileObject = new()
        {
            FileId = fileObject.FileId,
            FileObjectVariant = FileObjectVariant.Opus96,
            StorageArea = fileObject.StorageArea,
            StoragePath = newStoragePath,
            ObjectBlake3Hash = newHash,
            SizeInBytes = new FileInfo(outputPath).Length,
            MimeType = "audio/opus",
            Container = "opus",
            Extension = "opus",
            Codec = "opus",
            Lossless = false,
            AudioChannels = fileObject.AudioChannels,
            AudioSampleRate = audioStream?.SampleRate,
            Bitrate = targetBitRate * 1000,
            DurationInMs = fileObject.DurationInMs,
            ProcessingStatus = FileProcessingStatus.Completed,
        };

        logger.LogInformation(
            "Uploading Opus transcode for track file object {FileObjectId} to {StoragePath}",
            fileObject.Id,
            newStoragePath
        );

        await contentService.UploadFileFromTempAsync(
            newStoragePath,
            outputPath,
            newFileObject.MimeType,
            cancellationToken
        );

        logger.LogInformation(
            "Uploaded Opus transcode for track file object {FileObjectId}: {SizeInBytes} bytes",
            fileObject.Id,
            newFileObject.SizeInBytes
        );

        dbContext.FileObjects.Add(newFileObject);

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static AudioMetadataModel BuildAudioMetadata(FileObject fileObject)
    {
        Track? track = GetTrack(fileObject);

        if (track is null)
            return new AudioMetadataModel();

        AlbumTrack? albumTrack = track
            .AlbumTracks.OrderBy(albumTrack => albumTrack.AlbumDisc?.DiscNumber)
            .ThenBy(albumTrack => albumTrack.TrackNumber)
            .FirstOrDefault(albumTrack => albumTrack.AlbumDisc?.Album is not null);

        Album? album = albumTrack?.AlbumDisc?.Album;
        List<string> trackArtists = GetArtistNames(
            track.Credits,
            credit => credit.Credit,
            credit => credit.Party
        );
        List<string> albumArtists = album is not null
            ? GetArtistNames(album.Credits, credit => credit.Credit, credit => credit.Party)
            : [];

        return new AudioMetadataModel
        {
            Title = track.Title,
            Album = album?.Title,
            Artists = trackArtists.Count > 0 ? trackArtists : albumArtists,
            AlbumArtists = albumArtists.Count > 0 ? albumArtists : trackArtists,
            TrackNumber = albumTrack?.TrackNumber,
            DiscNumber = albumTrack?.AlbumDisc?.DiscNumber,
            ReleaseDate = album?.ReleaseDate,
        };
    }

    private async Task<(string?, string?)> TryDownloadAlbumCoverAsync(
        FileObject fileObject,
        string tempDir,
        CancellationToken cancellationToken
    )
    {
        AlbumTrack? albumTrack = GetTrack(fileObject)
            ?.AlbumTracks.OrderBy(albumTrack => albumTrack.AlbumDisc?.DiscNumber)
            .ThenBy(albumTrack => albumTrack.TrackNumber)
            .FirstOrDefault(albumTrack => albumTrack.AlbumDisc?.Album is not null);

        if (albumTrack?.AlbumDisc?.Album is not Album album)
        {
            logger.LogInformation(
                "No album cover found for track file object {FileObjectId}; no album is linked",
                fileObject.Id
            );
            return (null, null);
        }

        int albumDiscId = albumTrack.AlbumDiscId;

        AlbumImage? cover = album
            .Images.Where(image => image.ImageRole == ImageRole.Cover)
            .OrderByDescending(image => image.AlbumDiscId == albumDiscId)
            .ThenByDescending(image => image.AlbumDiscId is null)
            .ThenByDescending(image => image.IsPrimary)
            .ThenBy(image => image.CreatedAt)
            .FirstOrDefault(image => image.File?.FileObjects.Count > 0);

        FileObject? coverFileObject = cover
            ?.File?.FileObjects.OrderBy(fileObject =>
                fileObject.FileObjectVariant != FileObjectVariant.Original
            )
            .ThenBy(fileObject => fileObject.FileObjectVariant)
            .FirstOrDefault();

        if (coverFileObject is null)
        {
            logger.LogInformation(
                "No album cover file object found for track file object {FileObjectId}",
                fileObject.Id
            );
            return (null, null);
        }

        string coverPath = Path.Combine(
            tempDir,
            $"album_cover_{coverFileObject.Id}.{coverFileObject.Extension}"
        );

        await assetsService.DownloadFileToTempAsync(
            coverFileObject.StoragePath,
            coverPath,
            cancellationToken
        );

        logger.LogInformation(
            "Downloaded album cover for track file object {FileObjectId} from {StoragePath} to {CoverPath}",
            fileObject.Id,
            coverFileObject.StoragePath,
            coverPath
        );

        return (coverPath, coverFileObject.MimeType);
    }

    private static Track? GetTrack(FileObject fileObject)
    {
        return fileObject
            .File?.TrackAudios.OrderByDescending(audio => audio.Pinned)
            .ThenBy(audio => audio.Rank)
            .ThenBy(audio => audio.CreatedAt)
            .Select(audio => audio.Track)
            .FirstOrDefault(track => track is not null);
    }

    private static List<string> GetArtistNames<TCredit>(
        IEnumerable<TCredit> credits,
        Func<TCredit, CreditType> getCredit,
        Func<TCredit, Party?> getParty
    )
    {
        return credits
            .Where(credit => getCredit(credit) == CreditType.Artist && getParty(credit) is not null)
            .Select(credit => getParty(credit)!.Name)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(name => name)
            .ToList();
    }
}
