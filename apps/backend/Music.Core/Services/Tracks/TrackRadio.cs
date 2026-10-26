using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Music.Core.Services.Tracks;

public sealed class RadioTrackRequest
{
    public IReadOnlyList<int> BaseTrackIds { get; init; } = [];
    public IReadOnlyList<int> PlayedRadioTrackIds { get; init; } = [];
    public IReadOnlyList<int> UpcomingTrackIds { get; init; } = [];
    public bool IncludeInstrumental { get; init; }

    [Range(1, 20)]
    public int Count { get; init; } = 10;
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum RadioTrackReason
{
    SameArtist,
    RelatedArtist,
    Discovery,
}

public sealed class RadioTrack
{
    public required int AlbumId { get; init; }
    public required int AlbumDiscId { get; init; }
    public required int TrackId { get; init; }
    public required RadioTrackReason Reason { get; init; }
}
