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
            WorkerModel workerModel = await queue.DequeueAudioUploadProcessingAsync(stoppingToken);
            try
            {
                // TODO: run waveform/opus generation here.
                switch (workerModel)
                {
                    case TrackUploadProcessWorkerModel trackUploadWorker:
                        await ProcessTrackUploadAsync(trackUploadWorker, scopeFactory, logger, stoppingToken);
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

                string waveformHash = hashService.ComputeBlake3Hash(waveformPath);

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

            string newHash = hashService.ComputeBlake3Hash(newPath);

            string newStoragePath = contentService.GetStoragePath(
                MediaFolderOptions.DerivedMusic,
                newHash,
                "audio/opus");

            MediaProbeResult? newProbeResult = await mediaProbeService.ProbeAsync(newPath);


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
                AudioSampleRate = newProbeResult?.Streams?.FirstOrDefault(s => s.CodecType == "audio")?.SampleRate ?? 0,
                Bitrate = newProbeResult?.Format?.BitRate ?? fileObject.Bitrate ?? 0,
                DurationInMs = newProbeResult?.Streams?.FirstOrDefault(s => s.CodecType == "audio")?.Duration != null
                    ? (int)(newProbeResult.Streams.First(s => s.CodecType == "audio").Duration * 1000) : fileObject.DurationInMs,
                OriginalFileName = $"{fileObject.OriginalFileName}.{DateTime.UtcNow}.opus",
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
}
