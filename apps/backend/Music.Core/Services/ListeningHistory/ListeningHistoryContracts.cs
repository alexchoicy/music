using System.ComponentModel.DataAnnotations;

namespace Music.Core.Services.ListeningHistory;

public sealed class RecordListeningHistoryRequest
{
    [Range(1, int.MaxValue)]
    public required int AlbumId { get; init; }

    [Range(1, int.MaxValue)]
    public required int TrackId { get; init; }
}

public sealed class ListeningHistoryPageRequest
{
    [Range(1, long.MaxValue)]
    public long? Before { get; init; }

    [Range(1, 100)]
    public int Limit { get; init; } = 50;
}

public sealed class ListeningHistoryPage
{
    public required IReadOnlyList<ListeningHistoryEntryDetails> Entries { get; init; }
    public required long? NextCursor { get; init; }
}

public sealed class ListeningHistoryEntryDetails
{
    public required long EntryId { get; init; }
    public required DateTimeOffset PlayedAt { get; init; }
    public required int AlbumId { get; init; }
    public required string AlbumTitle { get; init; }
    public required int AlbumDiscId { get; init; }
    public required int TrackId { get; init; }
    public required string Title { get; init; }
    public required int DurationInMs { get; init; }
}

public sealed class ListeningHistoryCounts
{
    public required int TotalPlays { get; init; }
    public required int TrackCount { get; init; }
    public required IReadOnlyList<ListeningHistoryTrackCount> Tracks { get; init; }
}

public sealed class ListeningHistoryTrackCount
{
    public required int AlbumId { get; init; }
    public required string AlbumTitle { get; init; }
    public required int AlbumDiscId { get; init; }
    public required int TrackId { get; init; }
    public required string Title { get; init; }
    public required int DurationInMs { get; init; }
    public required int PlayCount { get; init; }
    public required DateTimeOffset LastPlayedAt { get; init; }
}
