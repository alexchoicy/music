using Music.Core.Enums;

namespace Music.Core.Models;

public sealed class AlbumListArtistModel
{
    public required int PartyId { get; init; }
    public required string Name { get; init; } = string.Empty;
}

public sealed class AlbumCoverVariantModel
{
    public required FileObjectVariant Variant { get; init; }
    public required string Url { get; init; } = string.Empty;
}

public sealed class AlbumListItemModel
{
    public required int AlbumId { get; init; }
    public required string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;

    public required AlbumType Type { get; init; }
    public DateTimeOffset? ReleaseDate { get; init; }

    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }

    public IReadOnlyList<AlbumCoverVariantModel> CoverVariants { get; init; } = [];

    public required IReadOnlyList<AlbumListArtistModel> Artists { get; init; } = [];

    public int TrackCount { get; init; }
    public int TotalDurationInMs { get; init; }
}
