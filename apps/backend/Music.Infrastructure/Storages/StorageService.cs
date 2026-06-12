using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Options;
using Music.Core.Common.Utils;
using Music.Core.Entities;
using Music.Core.Options;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Storage;
using Music.Core.Workers;

namespace Music.Infrastructure.Storages;

public class StorageService(
    IOptions<StorageOptions> options,
    IBackgroundTaskQueue backgroundTaskQueue
) : IStorageService
{
    private readonly StorageOptions _options =
        options?.Value ?? throw new ArgumentNullException(nameof(options));
    private readonly IBackgroundTaskQueue _backgroundTaskQueue = backgroundTaskQueue;

    public (StoredFile storedFile, FileObject fileObject) CreateStoredFileWithObject(
        FileRequest request,
        FileType fileType,
        string storagePath,
        StorageArea storageArea,
        FileObjectVariant fileObjectVariant,
        string userId,
        MediaSource source = MediaSource.UserUpload,
        string? sourceUrl = null
    )
    {
        if (string.IsNullOrWhiteSpace(request.Extension))
            throw new ValidationException("File extension is required.");

        StoredFile storedFile = new()
        {
            Type = fileType,
            OriginalFileName = request.OriginalFileName,
            OriginalBlake3Hash = request.Blake3Hash,
            UploadedByUserId = userId,
            Source = source,
            SourceUrl = sourceUrl,
        };

        FileObject fileObject = new()
        {
            File = storedFile,
            ProcessingStatus = FileProcessingStatus.Pending,
            StorageArea = storageArea,
            StoragePath = storagePath,
            ObjectBlake3Hash = request.Blake3Hash,
            FileObjectVariant = fileObjectVariant,
            SizeInBytes = request.SizeInBytes,
            MimeType = request.MimeType,
            Container = request.Container,
            Extension = request.Extension,
            Codec = request.Codec,
            AudioSampleRate = request.AudioSampleRate,
            Bitrate = request.Bitrate,
            DurationInMs = request.DurationInMs,
            FrameRate = request.FrameRate,
            Width = request.Width,
            Height = request.Height,
            Lossless = request.Lossless,
            AudioChannels = request.AudioChannels,
            BitsPerSample = request.BitsPerSample,
        };

        return (storedFile, fileObject);
    }

    public string GetStoragePath(
        MediaFolderOptions variant,
        string blake3Hash,
        string mimeType,
        string fileName = ""
    )
    {
        if (string.IsNullOrWhiteSpace(blake3Hash))
            throw new ArgumentException("Value cannot be null or empty.", nameof(blake3Hash));
        string folder = variant.GetFolder(_options.MediaFolders).TrimEnd('/');

        if (string.IsNullOrWhiteSpace(mimeType))
        {
            return $"{folder}/{blake3Hash}";
        }

        string ext = MediaFiles.GetExtensionFromMimeType(mimeType, fileName);

        return $"{folder}/{blake3Hash}.{ext}";
    }

    public string GetWaveformStoragePath(int trackSourceId)
    {
        string folder = MediaFolderOptions.AssetsPeak.GetFolder(_options.MediaFolders).TrimEnd('/');

        return $"{folder}/{trackSourceId}-B8-Pixel20.json";
    }

    public ValueTask RunBackgroundProcessUploadFileAsync(
        WorkerModel workerModel,
        CancellationToken cancellationToken = default
    )
    {
        return _backgroundTaskQueue.QueueWorkerAsync(workerModel, cancellationToken);
    }
}
