using Music.Core.Common.Enums;
using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Albums.Requests;
using Music.Core.Services.Albums.Results;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Services.Tracks;
using Music.Core.Services.Tracks.Enums;

namespace Music.Core.Services.Albums.Requests;

public sealed class CreateAlbumRequest
{
    public required string ClientTempAlbumId { get; init; }
    public required string Title { get; init; }
    public string Description { get; init; } = string.Empty;
    public required AlbumType Type { get; init; }

    public int? LanguageId { get; init; }
    public DateTimeOffset? ReleaseDate { get; init; }

    public required IReadOnlyList<CreditRequest> Credits { get; init; } = [];
    public AlbumImageRequest? Image { get; init; }
    public required IReadOnlyList<AlbumDiscRequest> Discs { get; init; } = [];
}

public sealed class AlbumImageRequest
{
    public required string ClientReferenceId { get; init; }
    public required FileRequest File { get; init; }
    public string Description { get; init; } = string.Empty;
    public FileCroppedAreaRequest? CroppedArea { get; init; }
}

public sealed class CreditRequest
{
    public required int PartyId { get; init; }
    public required CreditType Credit { get; init; }
}

public sealed class AlbumDiscRequest
{
    public required int DiscNumber { get; init; }
    public string Subtitle { get; init; } = string.Empty;
    public AlbumImageRequest? Image { get; init; }
    public required IReadOnlyList<AlbumTrackRequest> Tracks { get; init; } = [];
}

public sealed class AlbumTrackRequest
{
    public required string ClientTempTrackId { get; init; }
    public required int TrackNumber { get; init; }
    public required string Title { get; init; }
    public string Description { get; init; } = string.Empty;
    public required int DurationInMs { get; init; }

    public int? LanguageId { get; init; }
    public TrackContentType ContentType { get; init; } = TrackContentType.Music;
    public TrackVersionType VersionType { get; init; } = TrackVersionType.Original;
    public int? BasedOnTrackId { get; init; }

    public required IReadOnlyList<CreditRequest> Credits { get; init; } = [];
    public required IReadOnlyList<TrackAudioRequest> Audios { get; init; } = [];
}

public sealed class TrackAudioRequest
{
    public required FileRequest File { get; init; }
    public int Rank { get; init; } = 0;
    public bool Pinned { get; init; } = false;
    public MediaSource Source { get; set; } = MediaSource.Unknown;
    public string? SourceUrl { get; set; }
}
