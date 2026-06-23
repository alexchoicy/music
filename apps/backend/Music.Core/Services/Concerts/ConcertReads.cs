using Music.Core.Services.Albums;
using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Albums.Requests;
using Music.Core.Services.Albums.Results;
using Music.Core.Services.Concerts;
using Music.Core.Services.Concerts.Enums;
using Music.Core.Services.Concerts.Requests;
using Music.Core.Services.Concerts.Results;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Services.Parties;
using Music.Core.Services.Parties.Enums;
using Music.Core.Services.Parties.Requests;

namespace Music.Core.Services.Concerts;

public sealed class ConcertListRequest
{
    public string? Search { get; init; }
    public IReadOnlyList<int>? PartyIds { get; init; }
    public bool IsIncludeInGuestCredit { get; init; }
}

public sealed class ConcertPartySummary
{
    public required int PartyId { get; init; }
    public required string Name { get; init; } = string.Empty;
    public required PartyType Type { get; init; }
    public required ConcertPartyRole Role { get; init; }
}

public sealed class ConcertListItem
{
    public required int ConcertId { get; init; }
    public required string Title { get; init; } = string.Empty;
    public double Similarity { get; init; }
    public string Description { get; init; } = string.Empty;
    public DateTimeOffset? Date { get; init; }
    public required ImageFileVariants CoverVariants { get; init; }
    public required IReadOnlyList<ConcertPartySummary> Parties { get; init; } = [];
    public required int AlbumCount { get; init; }
    public required int FileCount { get; init; }
    public required int TotalDurationInMs { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }
}

public sealed class ConcertFileDetails
{
    public required int ConcertFileId { get; init; }
    public required string Title { get; init; } = string.Empty;
    public required ConcertFileType Type { get; init; }
    public required int Order { get; init; }
    public required MediaSource Source { get; init; }
    public string? SourceUrl { get; init; }
    public required ConcertFileVariants File { get; init; }
}

public sealed class ConcertFileVariants
{
    public required FileObjectDetails Original { get; init; }
    public FileObjectDetails? OriginalDash { get; init; }
    public FileObjectDetails? RemuxedOriginal { get; init; }
    public FileObjectDetails? DashAV1 { get; init; }
    public FileObjectDetails? Thumbnail640x360 { get; init; }
    public FileObjectDetails? AttachedPicture { get; init; }
    public required IReadOnlyList<FileObjectDetails> SubtitleVtt { get; init; } = [];
    public required IReadOnlyList<FileObjectDetails> SubtitleSup { get; init; } = [];
}

public sealed class ConcertDetails
{
    public required int ConcertId { get; init; }
    public required string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public DateTimeOffset? Date { get; init; }
    public required ImageFileVariants CoverVariants { get; init; }
    public required IReadOnlyList<ConcertPartySummary> LinkedParties { get; init; } = [];
    public required IReadOnlyList<AlbumListItem> LinkedAlbums { get; init; } = [];
    public required IReadOnlyList<ConcertFileDetails> Files { get; init; } = [];
    public required int TotalDurationInMs { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }
}
