using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Services.Tracks.Enums;

namespace Music.Core.Services.Albums;

// Everything the album edit page needs, including concurrency version and cover crops
public sealed class AlbumEditDetails
{
    public required int AlbumId { get; init; }
    public required string Title { get; init; }
    public required string Description { get; init; }
    public required AlbumType Type { get; init; }
    public int? LanguageId { get; init; }
    public DateTimeOffset? ReleaseDate { get; init; }
    public required uint Version { get; init; }

    public required IReadOnlyList<int> ArtistIds { get; init; } = [];

    public AlbumEditCover? Cover { get; init; }
    public required IReadOnlyList<AlbumEditDisc> Discs { get; init; } = [];
}

public sealed class AlbumEditCover
{
    public required int FileId { get; init; }
    public required FileProcessingStatus ProcessingStatus { get; init; }
    public FileCroppedAreaRequest? CroppedArea { get; init; }
    public required ImageFileVariants Variants { get; init; }
}

public sealed class AlbumEditDisc
{
    public required int AlbumDiscId { get; init; }
    public required int DiscNumber { get; init; }
    public required string Subtitle { get; init; }

    // Null when the disc has no cover of its own
    public AlbumEditCover? Cover { get; init; }

    public required IReadOnlyList<AlbumEditTrack> Tracks { get; init; } = [];
}

public sealed class AlbumEditTrack
{
    public required int TrackId { get; init; }
    public required int TrackNumber { get; init; }
    public required string Title { get; init; }
    public required int DurationInMs { get; init; }
    public required TrackContentType ContentType { get; init; }
    public required TrackVersionType VersionType { get; init; }
    public int? LanguageId { get; init; }
    public required IReadOnlyList<int> ArtistIds { get; init; } = [];

    // Tracks are shared, edits also show up on these other albums
    public required int OtherAlbumCount { get; init; }
}
