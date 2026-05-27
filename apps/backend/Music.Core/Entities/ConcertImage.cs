using Music.Core.Enums;

namespace Music.Core.Entities;

public class ConcertImage
{
    public int Id { get; set; }

    public int ConcertId { get; set; }
    public Concert? Concert { get; set; }

    public int FileId { get; set; }
    public StoredFile? File { get; set; }

    public int? CropX { get; set; }
    public int? CropY { get; set; }
    public int? CropWidth { get; set; }
    public int? CropHeight { get; set; }

    public ImageRole ImageRole { get; set; } = ImageRole.Cover;

    public bool IsPrimary { get; set; } = false;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
