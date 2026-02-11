using Music.Core.Enums;

namespace Music.Core.Entities;

public class Album
{
    public int Id { get; set; }

    public required string Title { get; set; }

    public string NormalizedTitle { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public AlbumType Type { get; set; } = AlbumType.Album;

    public int? LanguageId { get; set; }
    public Language? Language { get; set; }

    public required string CreatedByUserId { get; set; }

    public DateTimeOffset? ReleaseDate { get; set; }

    public byte[]? Version { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    // This credit is primary the main group of peoples
    // track can have different credits than album
    public ICollection<AlbumCredit> Credits { get; set; } = [];
    public ICollection<AlbumDisc> Discs { get; set; } = [];

    public ICollection<AlbumImage> Images { get; set; } = [];
}
