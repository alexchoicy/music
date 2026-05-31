using Music.Core.Domain.Tracks;
using Music.Core.Domain.Tracks.Enums;

namespace Music.Core.Entities;

public class Track
{
    public int Id { get; set; }

    public required string Title { get; set; }
    public string NormalizedTitle { get; set; } = string.Empty;

    public required int DurationInMs { get; set; }

    public string Description { get; set; } = string.Empty;

    public TrackVersionType VersionType { get; set; } = TrackVersionType.Original;

    public TrackContentType ContentType { get; set; } = TrackContentType.Music;

    public int? BasedOnTrackId { get; set; }
    public Track? BasedOnTrack { get; set; }

    public int? LanguageId { get; set; }
    public Language? Language { get; set; }

    public required string CreatedByUserId { get; set; }

    public uint Version { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<AlbumTrack> AlbumTracks { get; set; } = [];
    public ICollection<TrackCredit> Credits { get; set; } = [];

    public ICollection<TrackAudio> Audios { get; set; } = [];
    public ICollection<Track> DerivedTracks { get; set; } = [];
}

// Tracks -> TrackAudios -> File a file in the system
// -> have multiple FileObject (transcoded versions or thumbnails)
