using Music.Core.Domain.Files;
using Music.Core.Domain.Files.Enums;

namespace Music.Core.Entities;

public class StoredFile
{
    public int Id { get; set; }

    public required FileType Type { get; set; }

    public MediaSource Source { get; set; } = MediaSource.Unknown;
    public string? SourceUrl { get; set; }

    public string OriginalBlake3Hash { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;

    public string? UploadedByUserId { get; set; }

    // It will have the original file object, thumbnails, transcoded version
    public ICollection<FileObject> FileObjects { get; set; } = [];

    public ICollection<TrackAudio> TrackAudios { get; set; } = [];
    public ICollection<AlbumImage> AlbumImages { get; set; } = [];
    public ICollection<PartyImage> PartyImages { get; set; } = [];
    public ICollection<ConcertImage> ConcertImages { get; set; } = [];

    public ICollection<ConcertFile> ConcertFiles { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
