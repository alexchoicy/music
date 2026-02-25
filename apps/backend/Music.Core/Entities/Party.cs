using Music.Core.Enums;

namespace Music.Core.Entities;

public class Party
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public string NormalizedName { get; set; } = string.Empty;

    public DateTimeOffset ReleaseDate { get; set; }

    public int? LanguageId { get; set; }
    public Language? Language { get; set; }

    public PartyType Type { get; set; } = PartyType.Individual;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public byte[]? Version { get; set; }

    public ICollection<PartyMembership> Members { get; set; } = [];
    public ICollection<PartyMembership> MemberOf { get; set; } = [];

    public ICollection<AlbumCredit> AlbumCredits { get; set; } = [];
    public ICollection<TrackCredit> TrackCredits { get; set; } = [];

    public ICollection<PartyImage> Images { get; set; } = [];

    public ICollection<PartyAlias> Aliases { get; set; } = [];
}
