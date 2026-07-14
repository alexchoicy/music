namespace Music.Core.Services.Tracks;

public sealed record TrackPlaybackDetails
{
    public required string Title { get; init; }
    public required int DurationInMs { get; init; }
    public required IReadOnlyList<string> Artists { get; init; }
    public required string AlbumTitle { get; init; }
    public string? CoverUrl { get; init; }
}
