namespace Music.Core.Entities;

public class AlbumDisc
{
    public int Id { get; set; }

    public int AlbumId { get; set; }
    public Album? Album { get; set; }

    public int DiscNumber { get; set; } = 1;
    public string Subtitle { get; set; } = string.Empty;

    public byte[]? Version { get; set; }

    public ICollection<AlbumTrack> Tracks { get; set; } = [];
}
