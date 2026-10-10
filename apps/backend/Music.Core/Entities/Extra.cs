using Music.Core.Services.Extras.Enums;
using Music.Core.Services.Files.Enums;

namespace Music.Core.Entities;

// Extra content from physical releases: booklet scans, packaging scans,
// message cards, bonus audio/video etc.
// Can be linked to albums, concerts and parties.
public class Extra
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public required string Title { get; set; }

    public string Description { get; set; } = string.Empty;

    public ExtraCategory Category { get; set; } = ExtraCategory.Other;

    public MediaSource Source { get; set; } = MediaSource.Unknown;

    // null = fallback to the asset with the lowest SortOrder
    // Must be one of this extra's own assets.
    public Guid? CoverAssetId { get; set; }
    public ExtraAsset? CoverAsset { get; set; }

    // Crop applied when generating the cover variant from the cover asset
    public int? CoverCropX { get; set; }
    public int? CoverCropY { get; set; }
    public int? CoverCropWidth { get; set; }
    public int? CoverCropHeight { get; set; }

    public string? CreatedByUserId { get; set; }

    public uint Version { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<ExtraAsset> Assets { get; set; } = [];

    public ICollection<ExtraAlbum> ExtraAlbums { get; set; } = [];
    public ICollection<ExtraConcert> ExtraConcerts { get; set; } = [];
    public ICollection<ExtraParty> ExtraParties { get; set; } = [];
}
