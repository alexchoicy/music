using System;
using Music.Core.Enums;

namespace Music.Core.Models;

public sealed class CreateAlbumModel
{
    public required string Title { get; init; }
    public string Description { get; init; } = string.Empty;
    public required AlbumType Type { get; init; }

    public int? LanguageId { get; init; }
    public DateTimeOffset? ReleaseDate { get; init; }

    public required IReadOnlyList<AlbumCreditModel> AlbumCredits { get; init; } = [];
    public AlbumImageModel? AlbumImage { get; init; }

    public required IReadOnlyList<AlbumTrackModel> Tracks { get; init; } = [];
}

public sealed class AlbumImageModel
{
    public required CreateFileModel File { get; init; }
    public string Description { get; init; } = string.Empty;
}

public sealed class AlbumCreditModel
{
    public required int PartyId { get; init; }
    public required AlbumCreditType Credit { get; init; }
}

public sealed class AlbumTrackModel
{
    public required int TrackNumber { get; init; }
    public required int DiscNumber { get; init; }
    public required string Title { get; init; }
    public string Description { get; init; } = string.Empty;
    public bool IsMC { get; init; } = false;

    public required int DurationInMs { get; init; }
    public int? LanguageId { get; init; }

    public required IReadOnlyList<TrackCreditModel> TrackCredits { get; init; } = [];
    public required IReadOnlyList<TrackVariantModel> TrackVariants { get; init; } = [];
}

public sealed class TrackCreditModel
{
    public required int PartyId { get; init; }
    public required TrackCreditType Credit { get; init; }
}

public sealed class TrackVariantModel
{
    public required TrackVariantType VariantType { get; init; }
    public required IReadOnlyList<TrackSourceModel> Sources { get; init; } = [];
}

public sealed class TrackSourceModel
{
    public required TrackFrom From { get; init; }
    public required CreateFileModel File { get; init; }
}

public sealed class CreateFileModel
{
    public required string FileBlake3 { get; init; }
    public required string FileSHA1 { get; init; }
    public required string MimeType { get; init; }
    public required long FileSizeInBytes { get; init; }
    public required string Container { get; init; }
    public required string Extension { get; init; }

    public string? Codec { get; init; }

    public int? Width { get; init; }
    public int? Height { get; init; }

    public int? AudioSampleRate { get; init; }
    public int? Bitrate { get; init; }

    public decimal? FrameRate { get; init; }

    public int? DurationInMs { get; init; }

    public required string OriginalFileName { get; init; }
}

public sealed record CreateAlbumResult
{
    public required string AlbumTitle { get; init; }
    public bool IsSuccess { get; init; }
    public int? AlbumId { get; init; }
    public string? ErrorMessage { get; init; }

    public static CreateAlbumResult Success(string title, int albumId)
        => new() { AlbumTitle = title, IsSuccess = true, AlbumId = albumId };

    public static CreateAlbumResult Failure(string title, string errorMessage)
        => new() { AlbumTitle = title, IsSuccess = false, ErrorMessage = errorMessage };
}
