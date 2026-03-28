using Music.Core.Enums;

namespace Music.Core.Models;

public sealed class ConcertCoverVariantModel
{
    public required FileObjectVariant Variant { get; init; }
    public required string Url { get; init; } = string.Empty;
}

public sealed class ConcertPartySummaryModel
{
    public required int PartyId { get; init; }
    public required string Name { get; init; } = string.Empty;
    public required PartyType Type { get; init; }
    public required ConcertPartyRole Role { get; init; }
}

public sealed class ConcertListItemModel
{
    public required int ConcertId { get; init; }
    public required string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public DateTimeOffset? Date { get; init; }
    public required IReadOnlyList<ConcertCoverVariantModel> CoverVariants { get; init; } = [];
    public required IReadOnlyList<ConcertPartySummaryModel> Parties { get; init; } = [];
    public required int AlbumCount { get; init; }
    public required int FileCount { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }
}

public sealed class ConcertFileDetailsModel
{
    public required int ConcertFileId { get; init; }
    public required string Title { get; init; } = string.Empty;
    public required ConcertFileType Type { get; init; }
    public required int Order { get; init; }
    public required ConcertFileVariantsModel File { get; init; }
}

public sealed class ConcertFileVariantsModel
{
    public required FileObjectDetailsModel Original { get; init; }
    public FileObjectDetailsModel? DashAV1 { get; init; }
    public FileObjectDetailsModel? Thumbnail640x360 { get; init; }
    public FileObjectDetailsModel? AttachedPicture { get; init; }
    public required IReadOnlyList<FileObjectDetailsModel> SubtitleVtt { get; init; } = [];
    public required IReadOnlyList<FileObjectDetailsModel> SubtitleSup { get; init; } = [];
}

public sealed class ConcertDetailsModel
{
    public required int ConcertId { get; init; }
    public required string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public DateTimeOffset? Date { get; init; }
    public required IReadOnlyList<ConcertCoverVariantModel> CoverVariants { get; init; } = [];
    public required IReadOnlyList<ConcertPartySummaryModel> LinkedParties { get; init; } = [];
    public required IReadOnlyList<AlbumListItemModel> LinkedAlbums { get; init; } = [];
    public required IReadOnlyList<ConcertFileDetailsModel> Files { get; init; } = [];
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }
}
