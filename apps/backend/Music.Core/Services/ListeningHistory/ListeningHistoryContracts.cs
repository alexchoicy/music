using System.ComponentModel.DataAnnotations;
using Music.Core.Services.Albums;
using Music.Core.Services.Files;
using Music.Core.Services.Tracks.Enums;

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
    public int? AlbumLanguageId { get; init; }
    public required int AlbumDiscId { get; init; }
    public required int TrackId { get; init; }
    public required string Title { get; init; }
    public int? LanguageId { get; init; }
    public required int DurationInMs { get; init; }
    public required TrackContentType ContentType { get; init; }
    public required TrackVersionType VersionType { get; init; }
    public required ImageFileVariants Cover { get; init; }
    public required IReadOnlyList<TrackPartyCredit> Credits { get; init; }
    public required IReadOnlyList<TrackAudioDetails> Audios { get; init; }
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
    public int? AlbumLanguageId { get; init; }
    public required int AlbumDiscId { get; init; }
    public required int TrackId { get; init; }
    public required string Title { get; init; }
    public int? LanguageId { get; init; }
    public required int DurationInMs { get; init; }
    public required TrackContentType ContentType { get; init; }
    public required TrackVersionType VersionType { get; init; }
    public required ImageFileVariants Cover { get; init; }
    public required IReadOnlyList<TrackPartyCredit> Credits { get; init; }
    public required IReadOnlyList<TrackAudioDetails> Audios { get; init; }
    public required int PlayCount { get; init; }
    public required DateTimeOffset LastPlayedAt { get; init; }
}

public sealed class SaveResumePointRequest
{
    public required Guid DeviceId { get; init; }
    public required string DeviceName { get; init; }
    public required int AlbumId { get; init; }
    public required int TrackId { get; init; }
    public required long PositionMs { get; init; }

    // When the device reported this position; older reports never replace newer ones.
    public required DateTimeOffset ObservedAt { get; init; }
}
