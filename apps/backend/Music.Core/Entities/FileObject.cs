using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;

namespace Music.Core.Entities;

public class FileObject
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public int FileId { get; set; }
    public StoredFile? File { get; set; }

    public FileProcessingStatus ProcessingStatus { get; set; } = FileProcessingStatus.Pending;

    public required StorageArea StorageArea { get; set; }

    // storageType/variant/Blake3Hash.ext
    public required string StoragePath { get; set; } // can be S3 path, local path, etc.

    public required string ObjectBlake3Hash { get; set; }

    public required FileObjectVariant FileObjectVariant { get; set; }

    public required long SizeInBytes { get; set; }
    public required string MimeType { get; set; }
    public required string Container { get; set; } // e.g., "mp4", "mp3", "flac", etc.
    public required string Extension { get; set; } // e.g., "mp4", "mp3", "flac", etc
    public string? Codec { get; set; } // e.g., "aac", "vorbis", "opus", etc. // empty because image don't have codec

    public required bool Lossless { get; set; }

    public int? AudioChannels { get; set; }

    public int? BitsPerSample { get; set; }

    public int? Width { get; set; }
    public int? Height { get; set; }

    public int? AudioSampleRate { get; set; }

    public int? Bitrate { get; set; }
    public decimal? FrameRate { get; set; }

    public int? DurationInMs { get; set; } = null;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
