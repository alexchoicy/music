using Music.Core.Enums;
using Music.Core.Services.Interfaces;
using Microsoft.Extensions.Options;
using Music.Core.Models;
using Music.Core.Utils;

namespace Music.Infrastructure.Services.Storage;

public class StorageService(IOptions<StorageOptions> options) : IStorageService
{
    private readonly StorageOptions _options = options?.Value ?? throw new ArgumentNullException(nameof(options));

    public string GetStoragePath(MediaFolderOptions variant, string blake3Hash, string extension)
    {
        if (string.IsNullOrWhiteSpace(blake3Hash))
            throw new ArgumentException("Value cannot be null or empty.", nameof(blake3Hash));

        string folder = variant.GetFolder(_options.MediaFolders).TrimEnd('/');

        if (string.IsNullOrWhiteSpace(extension))
        {
            return $"{folder}/{blake3Hash}";
        }

        string ext = extension.StartsWith('.') ? extension : $".{extension}";

        return $"{folder}/{blake3Hash}{ext}";
    }
}
