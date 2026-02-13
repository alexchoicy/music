using Music.Core.Enums;
using Music.Core.Services.Interfaces;
using Microsoft.Extensions.Options;
using Music.Core.Models;
using Music.Core.Utils;
using Music.Core.Entities;
using System.Collections.Immutable;

namespace Music.Infrastructure.Services.Storage;

public class StorageService(IOptions<StorageOptions> options) : IStorageService
{
    private readonly StorageOptions _options = options?.Value ?? throw new ArgumentNullException(nameof(options));

    private static string GetExtensionFromMimeType(string mimeType)
    {
        if (MediaFiles.MimeToExt.TryGetValue(mimeType, out string? ext))
        {
            return ext;
        }

        return mimeType.Split('/').LastOrDefault() ?? string.Empty;
    }

    public string GetStoragePath(MediaFolderOptions variant, string blake3Hash, string extension)
    {
        if (string.IsNullOrWhiteSpace(blake3Hash))
            throw new ArgumentException("Value cannot be null or empty.", nameof(blake3Hash));
        string folder = variant.GetFolder(_options.MediaFolders).TrimEnd('/');

        if (string.IsNullOrWhiteSpace(extension))
        {
            return $"{folder}/{blake3Hash}";
        }

        string ext = GetExtensionFromMimeType(extension);

        return $"{folder}/{blake3Hash}.{ext}";
    }

    public (StoredFile storedFile, FileObject fileObject) CreateStoredFileWithObject(
        CreateFileModel model,
        FileType fileType,
        string storagePath,
        string userId)
    {
        StoredFile storedFile = new()
        {
            Type = fileType
        };

        FileObject fileObject = new()
        {
            File = storedFile,
            FileObjectVariant = FileObjectVariant.Original,
            StoragePath = storagePath,
            OriginalBlake3Hash = model.FileBlake3,
            CurrentBlake3Hash = model.FileBlake3,
            Type = FileObjectType.Original,
            SizeInBytes = model.FileSizeInBytes,
            MimeType = model.MimeType,
            Container = model.Container,
            Extension = model.Extension,
            Codec = model.Codec,
            AudioSampleRate = model.AudioSampleRate,
            Bitrate = model.Bitrate,
            DurationInMs = model.DurationInMs,
            OriginalFileName = model.OriginalFileName,
            FrameRate = model.FrameRate,
            Width = model.Width,
            Height = model.Height,
            CreatedByUserId = userId
        };

        return (storedFile, fileObject);
    }
}
