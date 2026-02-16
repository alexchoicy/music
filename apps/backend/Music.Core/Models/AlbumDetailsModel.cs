using Music.Core.Enums;

namespace Music.Core.Models;

public sealed class AlbumDetailsModel
{
    public required int AlbumId { get; init; }
    public required string Title { get; init; } = string.Empty;
    public required AlbumType Type { get; init; }
    public DateTimeOffset? ReleaseDate { get; init; }

    public required int TotalTrackCount { get; init; }
    public required int TotalDurationInMs { get; init; }

    public string? CoverImageUrl { get; init; }

    public required IReadOnlyList<AlbumPartyCreditModel> Credits { get; init; } = [];
    public required IReadOnlyList<AlbumDiscDetailsModel> Discs { get; init; } = [];
}

public sealed class AlbumPartyCreditModel
{
    public required int PartyId { get; init; }
    public required string Name { get; init; } = string.Empty;
    public required PartyType Type { get; init; }
    public required AlbumCreditType CreditType { get; init; }
}

public sealed class AlbumDiscDetailsModel
{
    public required int DiscNumber { get; init; }
    public string Subtitle { get; init; } = string.Empty;
    public required IReadOnlyList<AlbumTrackDetailsModel> Tracks { get; init; } = [];
}

public sealed class AlbumTrackDetailsModel
{
    public required int TrackId { get; init; }
    public required int TrackNumber { get; init; }
    public required string Title { get; init; } = string.Empty;
    public required int DurationInMs { get; init; }

    public required IReadOnlyList<TrackPartyCreditModel> Credits { get; init; } = [];
    public required IReadOnlyList<TrackVariantDetailsModel> TrackVariants { get; init; } = [];
}

public sealed class TrackPartyCreditModel
{
    public required int PartyId { get; init; }
    public required string Name { get; init; } = string.Empty;
    public required PartyType Type { get; init; }
    public required TrackCreditType CreditType { get; init; }
}

public sealed class TrackVariantDetailsModel
{
    public required TrackVariantType VariantType { get; init; }
    public required IReadOnlyList<TrackSourceDetailsModel> Sources { get; init; } = [];
}

public sealed class TrackSourceDetailsModel
{
    public required TrackSource Source { get; init; }
    public required int Rank { get; init; }
    public required bool Pinned { get; init; }

    public required TrackSourceFileVariantsModel File { get; init; }
}

public sealed class TrackSourceFileVariantsModel
{
    public required FileObjectDetailsModel Original { get; init; }
    public FileObjectDetailsModel? Opus96 { get; init; }
}

public sealed class FileObjectDetailsModel
{
    public required Guid Id { get; init; }

    public required string Url { get; init; }

    public required FileObjectType Type { get; init; }
    public required FileObjectVariant FileObjectVariant { get; init; }

    public required long SizeInBytes { get; init; }
    public required string MimeType { get; init; } = string.Empty;
    public required string Container { get; init; } = string.Empty;
    public required string Extension { get; init; } = string.Empty;
    public string? Codec { get; init; }

    public int? Width { get; init; }
    public int? Height { get; init; }

    public int? AudioSampleRate { get; init; }
    public int? Bitrate { get; init; }
    public decimal? FrameRate { get; init; }
    public int? DurationInMs { get; init; }

    public required string OriginalFileName { get; init; } = string.Empty;

    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }
}
