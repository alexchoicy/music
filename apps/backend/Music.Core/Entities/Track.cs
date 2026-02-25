namespace Music.Core.Entities;

public class Track
{
    public int Id { get; set; }

    public required string Title { get; set; }
    public string NormalizedTitle { get; set; } = string.Empty;

    public bool IsMC { get; set; } = false;

    public required int DurationInMs { get; set; }

    public string Description { get; set; } = string.Empty;

    public int? LanguageId { get; set; }
    public Language? Language { get; set; }

    public required string CreatedByUserId { get; set; }

    public byte[]? Version { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<AlbumTrack> AlbumTracks { get; set; } = [];
    public ICollection<TrackCredit> Credits { get; set; } = [];
    public ICollection<TrackVariant> Variants { get; set; } = [];
}

// Tracks -> TrackVariants (default, instrumental)
// -> TrackSources (A source track file can be multiple formats, e.g., mp3, aac, flac)
// -> File a file in the system
// -> have multiple FileObject (transcoded versions or thumbnails)
