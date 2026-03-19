namespace Music.Core.Entities;

public class ConcertAlbum
{
    public int ConcertId { get; set; }
    public Concert? Concert { get; set; }

    public int AlbumId { get; set; }
    public Album? Album { get; set; }
}
