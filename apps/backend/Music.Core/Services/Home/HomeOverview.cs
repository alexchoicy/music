namespace Music.Core.Services.Home;

public sealed class HomeOverview
{
    public required int AlbumCount { get; init; }
    public required int ArtistCount { get; init; }
    public required int ConcertCount { get; init; }
}
