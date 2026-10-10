namespace Music.Core.Entities;

public class PlaybackResumePoint
{
    public required string UserId { get; set; }
    public Guid DeviceId { get; set; }
    public required string DeviceName { get; set; }
    public int AlbumTrackId { get; set; }
    public AlbumTrack? AlbumTrack { get; set; }
    public long PositionMs { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
