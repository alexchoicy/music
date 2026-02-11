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

    public required IReadOnlyList<AlbumDiscModel> Discs { get; init; } = [];
}

public sealed class AlbumImageModel
{
    public required CreateFileModel File { get; init; }
    public string Description { get; init; } = string.Empty;
    public FileCroppedAreaModel? FileCroppedArea { get; init; }
}

public sealed class AlbumCreditModel
{
    public required int PartyId { get; init; }
    public required AlbumCreditType Credit { get; init; }
}


public sealed class AlbumDiscModel
{
    public required int DiscNumber { get; init; }
    public string Subtitle { get; init; } = string.Empty;
    public required IReadOnlyList<AlbumTrackModel> Tracks { get; init; } = [];
}


public sealed class AlbumTrackModel
{
    public required int TrackNumber { get; init; }
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
    public required TrackSource Source { get; init; }
    public required CreateFileModel File { get; init; }
}

public sealed record CreateAlbumResult
{
    public required string AlbumTitle { get; init; }
    public bool IsSuccess { get; init; }
    public string? ErrorMessage { get; init; }
    public CreateAlbumUploadResult CreateAlbumUploadResults { get; init; }

    public static CreateAlbumResult Success(string title, CreateAlbumUploadResult uploadResults)
        => new() { AlbumTitle = title, IsSuccess = true, CreateAlbumUploadResults = uploadResults };
    public static CreateAlbumResult Failure(string title, string errorMessage)
        => new() { AlbumTitle = title, IsSuccess = false, ErrorMessage = errorMessage };
}

public sealed record CreateAlbumUploadItemResult
{
    public required string Blake3Id { get; init; }
    public required string FileName { get; init; }
    public required string UploadUrl { get; init; }
}

public sealed record CreateAlbumUploadResult
{
    public string AlbumTitle { get; init; }
    public CreateAlbumUploadItemResult AlbumImage { get; set; }
    public List<CreateAlbumUploadItemResult> Tracks { get; set; } = [];
}
