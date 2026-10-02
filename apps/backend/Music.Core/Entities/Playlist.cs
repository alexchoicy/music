namespace Music.Core.Entities;

public class Playlist
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string OwnerUserId { get; set; }
    public uint Version { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<PlaylistEntry> Entries { get; set; } = [];
}
