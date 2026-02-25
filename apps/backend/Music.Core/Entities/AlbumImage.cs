namespace Music.Core.Entities;

// Only handle cover
// Other extra content will be handled by
// TODO: AlbumExtraContent

public class AlbumImage
{
    public int Id { get; set; }

    public int AlbumId { get; set; }
    public Album? Album { get; set; }

    public int FileId { get; set; }
    public StoredFile? File { get; set; }

    public int? CropX { get; set; }
    public int? CropY { get; set; }
    public int? CropWidth { get; set; }
    public int? CropHeight { get; set; }

    public bool IsPrimary { get; set; } = false;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
