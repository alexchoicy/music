namespace Music.Core.Entities;

public class ListeningHistoryEntry
{
    public long Id { get; set; }
    public required string UserId { get; set; }
    public int AlbumTrackId { get; set; }
    public AlbumTrack? AlbumTrack { get; set; }
    public DateTimeOffset PlayedAt { get; set; } = DateTimeOffset.UtcNow;
}
