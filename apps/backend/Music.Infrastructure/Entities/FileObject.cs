using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Music.Core.Enums;

namespace Music.Infrastructure.Entities;

[Table("FileObjects")]
[PrimaryKey(nameof(Id))]
public class FileObject
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public int FileId { get; set; }
    public StoredFile? File { get; set; }

    public Status Status { get; set; } = Status.Pending;

    // storageType/variant/Blake3Hash.ext
    public required string StoragePath { get; set; } // can be S3 path, local path, etc.

    public required string OriginalBlake3Hash { get; set; } // I have this idea because this file will be changed with metadata after upload
    public required string CurrentBlake3Hash { get; set; }

    public required FileObjectType Type { get; set; }

    public required long SizeInBytes { get; set; }
    public required string MimeType { get; set; }
    public required string Container { get; set; } // e.g., "mp4", "mp3", "flac", etc.
    public string? Codec { get; set; } // e.g., "aac", "vorbis", "opus", etc. // empty because image don't have codec

    public int? Width { get; set; }
    public int? Height { get; set; }

    public int? AudioSampleRate { get; set; }

    public int? Bitrate { get; set; }
    public decimal? FrameRate { get; set; }

    public int? DurationInMs { get; set; } = null;

    public string? CreatedByUserId { get; set; } // null = system
    public User? CreatedByUser { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
