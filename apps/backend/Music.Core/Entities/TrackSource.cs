namespace Music.Core.Entities;

public class TrackSource
{
    public int Id { get; set; }

    public int TrackVariantId { get; set; }
    public TrackVariant? TrackVariant { get; set; }

    public int FileId { get; set; }
    public StoredFile? File { get; set; }

    // Ranking the audio from source, can be flac, mp3 etc.
    // But they are source not transcoded version by us
    public int Rank { get; set; } = 0;// lower is better

    public bool Pinned { get; set; } = false; // override rank

    public required Core.Enums.TrackSource Source { get; set; }

    // null = by system
    public string? UploadedByUserId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
