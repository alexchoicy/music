namespace Music.Core.Entities;

public class Language
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public ICollection<Album> Albums { get; set; } = [];
    public ICollection<Track> Tracks { get; set; } = [];
}
