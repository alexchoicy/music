using Music.Core.Enums;

namespace Music.Core.Entities;

// I think this only apply to party cover and banner images
// other extra content will be handled by
// TODO: PartyExtraContent
public class PartyImage
{
    public int Id { get; set; }

    public required int PartyId { get; set; }
    public Party? Party { get; set; }

    public required int FileId { get; set; }
    public StoredFile? File { get; set; }

    public int? CropX { get; set; }
    public int? CropY { get; set; }
    public int? CropWidth { get; set; }
    public int? CropHeight { get; set; }

    public bool IsPrimary { get; set; } = false;

    public required PartyImageType PartyImageType { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
