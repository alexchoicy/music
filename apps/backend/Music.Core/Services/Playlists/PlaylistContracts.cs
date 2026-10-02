using System.ComponentModel.DataAnnotations;

namespace Music.Core.Services.Playlists;

public sealed class CreatePlaylistRequest
{
    [Required, StringLength(200)]
    public required string Name { get; init; }
}

public sealed class RenamePlaylistRequest
{
    [Required, StringLength(200)]
    public required string Name { get; init; }
    public required uint Version { get; init; }
}

public sealed class PlaylistTrackRequest
{
    [Range(1, int.MaxValue)]
    public required int AlbumDiscId { get; init; }

    [Range(1, int.MaxValue)]
    public required int TrackId { get; init; }
}

public sealed class AddPlaylistEntriesRequest
{
    public required uint Version { get; init; }

    [Required, MinLength(1), MaxLength(1000)]
    public required IReadOnlyList<PlaylistTrackRequest> Tracks { get; init; }
}

public sealed class ReorderPlaylistEntriesRequest
{
    public required uint Version { get; init; }

    [Required]
    public required IReadOnlyList<int> EntryIds { get; init; }
}

public sealed class PlaylistListItem
{
    public required int PlaylistId { get; init; }
    public required string Name { get; init; }
    public required uint Version { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }
    public required int TrackCount { get; init; }
    public required long TotalDurationInMs { get; init; }
}

public sealed class PlaylistDetails
{
    public required int PlaylistId { get; init; }
    public required string Name { get; init; }
    public required uint Version { get; init; }
    public required IReadOnlyList<PlaylistEntryDetails> Entries { get; init; }
}

public sealed class PlaylistEntryDetails
{
    public required int EntryId { get; init; }
    public required int AlbumId { get; init; }
    public required string AlbumTitle { get; init; }
    public required int AlbumDiscId { get; init; }
    public required int TrackId { get; init; }
    public required string Title { get; init; }
    public required int DurationInMs { get; init; }
}
