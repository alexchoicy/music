using System.Text.Json.Serialization;

namespace Music.Core.Services.WebSockets;

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(MusicWebSocketMessage), "music")]
[JsonDerivedType(typeof(ConcertWebSocketMessage), "concert")]
[JsonDerivedType(typeof(EventsWebSocketMessage), "events")]
public abstract record WebSocketMessage;

public sealed record MusicWebSocketMessage : WebSocketMessage
{
    [JsonPropertyName("data")]
    public required PlaybackData Data { get; init; }
}

public sealed record ConcertWebSocketMessage : WebSocketMessage
{
    [JsonPropertyName("data")]
    public required PlaybackData Data { get; init; }
}

public sealed record EventsWebSocketMessage : WebSocketMessage
{
    [JsonPropertyName("data")]
    public required EventsData Data { get; init; }
}

public sealed class PlaybackData
{
    private long _positionMs;

    [JsonPropertyName("action")]
    public required PlaybackAction Action { get; init; }

    [JsonPropertyName("positionMs")]
    public required long PositionMs
    {
        get => _positionMs;
        init
        {
            ArgumentOutOfRangeException.ThrowIfNegative(value);
            _positionMs = value;
        }
    }

    [JsonPropertyName("trackID")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? TrackID { get; init; }
}

public sealed record EventsData;

public enum PlaybackAction
{
    [JsonStringEnumMemberName("play")]
    Play,

    [JsonStringEnumMemberName("pause")]
    Pause,

    [JsonStringEnumMemberName("change")]
    Change,

    [JsonStringEnumMemberName("changeTime")]
    ChangeTime,

    [JsonStringEnumMemberName("end")]
    End,

}
