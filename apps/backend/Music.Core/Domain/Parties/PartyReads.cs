using Music.Core.Domain.Albums;
using Music.Core.Domain.Files.Enums;
using Music.Core.Domain.Parties.Enums;

namespace Music.Core.Domain.Parties;

public sealed class PartyListRequest
{
    public string? Search { get; init; }
}

public sealed class PartyAlias
{
    public required string Name { get; init; } = string.Empty;
    public required string NormalizedName { get; init; } = string.Empty;
}

public sealed class PartyListItem
{
    public required int PartyId { get; init; }
    public required string Name { get; init; } = string.Empty;
    public required string NormalizedName { get; init; } = string.Empty;
    public required IReadOnlyList<PartyAlias> Aliases { get; init; } = [];
}

public sealed class PartySummary
{
    public required int PartyId { get; init; }
    public required string Name { get; init; } = string.Empty;
    public IReadOnlyList<PartyImage>? AvatarImages { get; init; }
    public PartyType Type { get; init; } = PartyType.Individual;
}

public sealed class PartyDetails
{
    public required int PartyId { get; init; }
    public required string Name { get; init; } = string.Empty;
    public IReadOnlyList<PartyImage>? AvatarImages { get; init; }
    public IReadOnlyList<PartyImage>? BannerImages { get; init; }
    public PartyType Type { get; init; } = PartyType.Individual;
    public Language? Language { get; init; }
    public required IReadOnlyList<AlbumListItem> Albums { get; init; } = [];
    public required IReadOnlyList<AlbumListItem> AppearsOnAlbums { get; init; } = [];
}

public sealed class PartyImage
{
    public required FileObjectVariant Variant { get; init; }
    public required string Url { get; init; } = string.Empty;
}

public sealed class Language
{
    public required int LanguageId { get; init; }
    public required string Name { get; init; } = string.Empty;
}
