namespace Music.Core.Services.Tracks;

public sealed class RadioTrackRequest
{
    public IReadOnlyList<int> QueueTrackIds { get; init; } = [];
    public bool IncludeInstrumental { get; init; }
}

public sealed class RadioTrack
{
    public required int AlbumId { get; init; }
    public required int AlbumDiscId { get; init; }
    public required int TrackId { get; init; }
}
