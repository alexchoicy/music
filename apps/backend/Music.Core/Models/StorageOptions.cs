using Music.Core.Enums;

namespace Music.Core.Models;

public sealed class MediaFoldersOptions
{
    public string OriginalMusic { get; init; } = "media/originals/music";
    public string OriginalVideo { get; init; } = "media/originals/video";
    public string OriginalExtra { get; init; } = "media/originals/extra";
    public string DerivatedMusic { get; init; } = "media/derivatives/music";
    public string DerivatedVideo { get; init; } = "media/derivatives/video";

    public string AssetsCover { get; init; } = "assets/cover";
    public string AssetsParty { get; init; } = "assets/party";
}

public sealed class S3StorageOptions
{
    public required string AccessURL { get; init; }
    public required string BucketName { get; init; }
    public string Region { get; init; } = "auto";
    public string? Endpoint { get; init; }
    public required string AccessKey { get; init; }
    public required string SecretKey { get; init; }
}

public sealed class DataStorageOptions
{
    public required StorageProvider Provider { get; init; }
    public S3StorageOptions? S3 { get; init; }
}

public sealed class StorageOptions
{
    public required string TempDir { get; init; }
    public MediaFoldersOptions MediaFolders { get; init; } = new();
    public required DataStorageOptions Content { get; init; }
    public required DataStorageOptions Assets { get; init; }
}
