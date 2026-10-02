namespace Music.Core.Entities;

public class PlaylistEntry
{
    public int Id { get; set; }
    public int PlaylistId { get; set; }
    public Playlist? Playlist { get; set; }
    public int AlbumTrackId { get; set; }
    public AlbumTrack? AlbumTrack { get; set; }
    public int Position { get; set; }
}
