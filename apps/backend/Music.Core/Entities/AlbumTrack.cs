namespace Music.Core.Entities;

public class AlbumTrack
{
    public int Id { get; set; }

    public int AlbumDiscId { get; set; }
    public AlbumDisc? AlbumDisc { get; set; }

    public int TrackId { get; set; }
    public Track? Track { get; set; }

    public int TrackNumber { get; set; } = 1;

    public byte[]? Version { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
