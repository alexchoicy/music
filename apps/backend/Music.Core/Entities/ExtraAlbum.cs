namespace Music.Core.Entities;

public class ExtraAlbum
{
    public Guid ExtraId { get; set; }
    public Extra? Extra { get; set; }

    public int AlbumId { get; set; }
    public Album? Album { get; set; }

    // Set when the extra belongs to a specific disc, e.g. disc 2 of a box set
    public int? AlbumDiscId { get; set; }
    public AlbumDisc? AlbumDisc { get; set; }
}
