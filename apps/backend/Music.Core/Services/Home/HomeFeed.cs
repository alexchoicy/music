using Music.Core.Services.Albums;
using Music.Core.Services.Concerts;
using Music.Core.Services.Parties;

namespace Music.Core.Services.Home;

public sealed class HomeFeed
{
    public required IReadOnlyList<ContinueListeningItem> ContinueListening { get; init; }
    public required IReadOnlyList<AlbumListItem> RecentlyPlayed { get; init; }
    public required IReadOnlyList<AlbumListItem> RecentAlbums { get; init; }
    public required IReadOnlyList<PartyItems> RecentParties { get; init; }
    public required IReadOnlyList<ConcertListItem> RecentConcerts { get; init; }
}

public sealed class ContinueListeningItem
{
    public required Guid DeviceId { get; init; }
    public required string DeviceName { get; init; }
    public required int TrackId { get; init; }
    public required string TrackTitle { get; init; }
    public required int DurationInMs { get; init; }
    public required long PositionMs { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }
    public required AlbumListItem Album { get; init; }
}
