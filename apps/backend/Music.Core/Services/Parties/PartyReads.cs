using Music.Core.Services.Albums;
using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Albums.Requests;
using Music.Core.Services.Albums.Results;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Services.Parties;
using Music.Core.Services.Parties.Enums;
using Music.Core.Services.Parties.Requests;

namespace Music.Core.Services.Parties;

public sealed class PartyListRequest
{
    public string? Search { get; init; }
    public CountryCode? Country { get; init; }
    public PartyType? Type { get; init; }
    public PartyKind? Kind { get; init; }
    public PartyGender? Gender { get; init; }
}

public sealed class PartyAlias
{
    public required string Name { get; init; } = string.Empty;
    public required string NormalizedName { get; init; } = string.Empty;
}

public sealed class PartyItems
{
    public required int PartyId { get; init; }
    public required string Name { get; init; } = string.Empty;
    public required string NormalizedName { get; init; } = string.Empty;
    public required string CoverUrl { get; init; } = string.Empty;
    public required CountryCode Country { get; init; }
    public PartyType Type { get; init; } = PartyType.Individual;
    public required PartyKind Kind { get; init; }
    public PartyGender Gender { get; init; } = PartyGender.Unknown;
    public double Similarity { get; init; }
    public required int AlbumCount { get; init; }
    public required IReadOnlyList<PartyAlias> Aliases { get; init; } = [];
}

public sealed class PartySummary
{
    public required int PartyId { get; init; }
    public required string Name { get; init; } = string.Empty;
    public IReadOnlyList<PartyImage>? AvatarImages { get; init; }
    public PartyType Type { get; init; } = PartyType.Individual;
    public required PartyKind Kind { get; init; }
    public PartyGender Gender { get; init; } = PartyGender.Unknown;
}

public sealed class PartyDetails
{
    public required int PartyId { get; init; }
    public required string Name { get; init; } = string.Empty;
    public IReadOnlyList<PartyImage>? AvatarImages { get; init; }
    public required CountryCode Country { get; init; }
    public required string Description { get; init; } = string.Empty;
    public PartyType Type { get; init; } = PartyType.Individual;
    public required PartyKind Kind { get; init; }
    public PartyGender Gender { get; init; } = PartyGender.Unknown;
    public required IReadOnlyList<PartyAlias> Aliases { get; init; } = [];
    public required IReadOnlyList<PartyExternalInfoLink> ExternalInfoLinks { get; init; } = [];
    public required IReadOnlyList<AlbumListItem> Albums { get; init; } = [];
    public required IReadOnlyList<AlbumListItem> AppearsOnAlbums { get; init; } = [];
}

public sealed class PartyExternalInfoLink
{
    public required PartyExternalInfoType Type { get; init; }
    public required string Url { get; init; } = string.Empty;
}

public sealed class PartyImage
{
    public required FileObjectVariant Variant { get; init; }
    public required string Url { get; init; } = string.Empty;
}
