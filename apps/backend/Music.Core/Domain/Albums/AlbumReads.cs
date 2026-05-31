using Music.Core.Domain.Files;
using Music.Core.Domain.Files.Enums;
using Music.Core.Domain.Parties;
using Music.Core.Domain.Parties.Enums;
using Music.Core.Domain.Tracks;
using Music.Core.Domain.Tracks.Enums;

namespace Music.Core.Domain.Albums;

public sealed class AlbumSummary
{
    public required string Title { get; init; } = string.Empty;
    public required IReadOnlyList<string> Credits { get; init; } = [];
    public required string CoverUrl { get; init; } = string.Empty;
}

public sealed class AlbumListArtist
{
    public required int PartyId { get; init; }
    public required string Name { get; init; } = string.Empty;
}

public sealed class AlbumCoverVariant
{
    public required FileObjectVariant Variant { get; init; }
    public required string Url { get; init; } = string.Empty;
}

public sealed class AlbumListItem
{
    public required int AlbumId { get; init; }
    public required string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;

    public required AlbumType Type { get; init; }
    public DateTimeOffset? ReleaseDate { get; init; }

    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }

    public IReadOnlyList<AlbumCoverVariant> CoverVariants { get; init; } = [];
    public required IReadOnlyList<AlbumListArtist> Artists { get; init; } = [];

    public int TrackCount { get; init; }
    public int TotalDurationInMs { get; init; }
}

public sealed class AlbumDetails
{
    public required int AlbumId { get; init; }
    public required string Title { get; init; } = string.Empty;
    public required AlbumType Type { get; init; }
    public DateTimeOffset? ReleaseDate { get; init; }

    public required int TotalTrackCount { get; init; }
    public required int TotalDurationInMs { get; init; }

    public string? CoverImageUrl { get; init; }

    public required IReadOnlyList<AlbumPartyCredit> Credits { get; init; } = [];
    public required IReadOnlyList<AlbumDiscDetails> Discs { get; init; } = [];
}

public sealed class AlbumPartyCredit
{
    public required int PartyId { get; init; }
    public required string Name { get; init; } = string.Empty;
    public required PartyType Type { get; init; }
    public required AlbumCreditType CreditType { get; init; }
    public required IReadOnlyList<PartyImage> Avatar { get; init; }
}

public sealed class AlbumDiscDetails
{
    public required int DiscNumber { get; init; }
    public string Subtitle { get; init; } = string.Empty;
    public required IReadOnlyList<AlbumTrackDetails> Tracks { get; init; } = [];
}

public sealed class AlbumTrackDetails
{
    public required int TrackId { get; init; }
    public required int TrackNumber { get; init; }
    public required string Title { get; init; } = string.Empty;
    public required int DurationInMs { get; init; }

    public required TrackContentType ContentType { get; init; }
    public required TrackVersionType VersionType { get; init; }
    public int? BasedOnTrackId { get; init; }

    public required IReadOnlyList<TrackPartyCredit> Credits { get; init; } = [];
    public required IReadOnlyList<TrackAudioDetails> Audios { get; init; } = [];
}

public sealed class TrackPartyCredit
{
    public required int PartyId { get; init; }
    public required string Name { get; init; } = string.Empty;
    public required PartyType Type { get; init; }
    public required TrackCreditType CreditType { get; init; }
    public required IReadOnlyList<PartyImage> Avatar { get; init; }
}

public sealed class TrackAudioDetails
{
    public required int Rank { get; init; }
    public required bool Pinned { get; init; }
    public required TrackAudioFileVariants File { get; init; }
}

public sealed class TrackAudioFileVariants
{
    public required FileObjectDetails Original { get; init; }
    public FileObjectDetails? Opus96 { get; init; }
    public FileObjectDetails? WaveformB8Pixel20 { get; init; }
}

public sealed class AlbumTrackDownloadItem
{
    public required int TrackId { get; init; }
    public required int DiscNumber { get; init; }
    public required int TrackNumber { get; init; }
    public required string TrackTitle { get; init; } = string.Empty;
    public required FileObjectVariant Variant { get; init; }
    public required string FileName { get; init; } = string.Empty;
    public required string Url { get; init; } = string.Empty;
}
