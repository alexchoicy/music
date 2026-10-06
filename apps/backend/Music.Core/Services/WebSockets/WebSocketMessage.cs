using System.Text.Json;
using System.Text.Json.Serialization;

namespace Music.Core.Services.WebSockets;

// Messages sent by clients.
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(RegisterDeviceWebSocketMessage), "register")]
[JsonDerivedType(typeof(PlaybackStateWebSocketMessage), "state")]
[JsonDerivedType(typeof(DeviceControlWebSocketMessage), "control")]
[JsonDerivedType(typeof(DiscordDeviceWebSocketMessage), "discordDevice")]
[JsonDerivedType(typeof(TransferWebSocketMessage), "transfer")]
[JsonDerivedType(typeof(TransferSnapshotWebSocketMessage), "transferSnapshot")]
[JsonDerivedType(typeof(TransferResultWebSocketMessage), "transferResult")]
[JsonDerivedType(typeof(ConcertWebSocketMessage), "concert")]
[JsonDerivedType(typeof(EventsWebSocketMessage), "events")]
public abstract record WebSocketMessage;

public sealed record RegisterDeviceWebSocketMessage : WebSocketMessage
{
    [JsonPropertyName("data")]
    public required RegisterDeviceData Data { get; init; }
}

public sealed record PlaybackStateWebSocketMessage : WebSocketMessage
{
    [JsonPropertyName("data")]
    public required PlaybackStateData Data { get; init; }
}

public sealed record DeviceControlWebSocketMessage : WebSocketMessage
{
    [JsonPropertyName("data")]
    public required DeviceControlData Data { get; init; }
}

public sealed record DiscordDeviceWebSocketMessage : WebSocketMessage
{
    [JsonPropertyName("data")]
    public required DiscordDeviceData Data { get; init; }
}

public sealed record TransferWebSocketMessage : WebSocketMessage
{
    [JsonPropertyName("data")]
    public required TransferData Data { get; init; }
}

public sealed record TransferSnapshotWebSocketMessage : WebSocketMessage
{
    [JsonPropertyName("data")]
    public required TransferSnapshotData Data { get; init; }
}

public sealed record TransferResultWebSocketMessage : WebSocketMessage
{
    [JsonPropertyName("data")]
    public required TransferResultData Data { get; init; }
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

// Messages sent by the server.
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(DevicesServerMessage), "devices")]
[JsonDerivedType(typeof(DeviceControlServerMessage), "control")]
[JsonDerivedType(typeof(TransferSnapshotRequestServerMessage), "transferSnapshotRequest")]
[JsonDerivedType(typeof(TransferSnapshotServerMessage), "transferSnapshot")]
[JsonDerivedType(typeof(TransferReleaseServerMessage), "transferRelease")]
[JsonDerivedType(typeof(TransferFailedServerMessage), "transferFailed")]
public abstract record WebSocketServerMessage;

public sealed record DevicesServerMessage : WebSocketServerMessage
{
    [JsonPropertyName("data")]
    public required DevicesData Data { get; init; }
}

public sealed record DeviceControlServerMessage : WebSocketServerMessage
{
    [JsonPropertyName("data")]
    public required DeviceControlCommandData Data { get; init; }
}

public sealed record TransferSnapshotRequestServerMessage : WebSocketServerMessage
{
    [JsonPropertyName("data")]
    public required TransferSnapshotRequestData Data { get; init; }
}

public sealed record TransferSnapshotServerMessage : WebSocketServerMessage
{
    [JsonPropertyName("data")]
    public required TransferSnapshotData Data { get; init; }
}

public sealed record TransferReleaseServerMessage : WebSocketServerMessage
{
    [JsonPropertyName("data")]
    public required TransferReleaseData Data { get; init; }
}

public sealed record TransferFailedServerMessage : WebSocketServerMessage
{
    [JsonPropertyName("data")]
    public required TransferFailedData Data { get; init; }
}

public sealed record RegisterDeviceData
{
    [JsonPropertyName("deviceId")]
    public required Guid DeviceId { get; init; }

    // Identifies one browser tab; tabs on the same device share the device ID.
    [JsonPropertyName("sessionId")]
    public required Guid SessionId { get; init; }

    [JsonPropertyName("name")]
    public required string Name { get; init; }
}

public sealed record PlaybackStateData
{
    private readonly long _positionMs;

    [JsonPropertyName("status")]
    public required PlaybackStatus Status { get; init; }

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

    [JsonPropertyName("track")]
    public PlaybackTrackData? Track { get; init; }
}

public sealed record PlaybackTrackData
{
    [JsonPropertyName("trackId")]
    public required string TrackId { get; init; }

    [JsonPropertyName("albumId")]
    public required string AlbumId { get; init; }

    [JsonPropertyName("title")]
    public required string Title { get; init; }

    [JsonPropertyName("albumTitle")]
    public required string AlbumTitle { get; init; }

    [JsonPropertyName("artists")]
    public required IReadOnlyList<string> Artists { get; init; }

    [JsonPropertyName("coverUrl")]
    public string? CoverUrl { get; init; }

    [JsonPropertyName("durationMs")]
    public required long DurationMs { get; init; }
}

public enum PlaybackStatus
{
    [JsonStringEnumMemberName("idle")]
    Idle,

    [JsonStringEnumMemberName("loading")]
    Loading,

    [JsonStringEnumMemberName("ready")]
    Ready,

    [JsonStringEnumMemberName("playing")]
    Playing,

    [JsonStringEnumMemberName("paused")]
    Paused,
}

public sealed record DeviceControlData
{
    [JsonPropertyName("deviceId")]
    public required Guid DeviceId { get; init; }

    [JsonPropertyName("sessionId")]
    public required Guid SessionId { get; init; }

    [JsonPropertyName("action")]
    public required DeviceControlAction Action { get; init; }
}

public sealed record DeviceControlCommandData
{
    [JsonPropertyName("action")]
    public required DeviceControlAction Action { get; init; }
}

public enum DeviceControlAction
{
    [JsonStringEnumMemberName("play")]
    Play,

    [JsonStringEnumMemberName("pause")]
    Pause,
}

public sealed record DiscordDeviceData
{
    // Null follows whichever session started playing most recently.
    [JsonPropertyName("deviceId")]
    public Guid? DeviceId { get; init; }
}

public sealed record TransferData
{
    [JsonPropertyName("requestId")]
    public required Guid RequestId { get; init; }

    [JsonPropertyName("deviceId")]
    public required Guid DeviceId { get; init; }

    [JsonPropertyName("sessionId")]
    public required Guid SessionId { get; init; }
}

public sealed record TransferSnapshotRequestData
{
    [JsonPropertyName("requestId")]
    public required Guid RequestId { get; init; }

    [JsonPropertyName("deviceName")]
    public required string DeviceName { get; init; }
}

public sealed record TransferSnapshotData
{
    [JsonPropertyName("requestId")]
    public required Guid RequestId { get; init; }

    // Player state owned by the web client; the server only relays it between the user's sessions.
    [JsonPropertyName("snapshot")]
    public JsonElement? Snapshot { get; init; }
}

public sealed record TransferResultData
{
    [JsonPropertyName("requestId")]
    public required Guid RequestId { get; init; }

    [JsonPropertyName("success")]
    public required bool Success { get; init; }
}

public sealed record TransferReleaseData
{
    [JsonPropertyName("requestId")]
    public required Guid RequestId { get; init; }
}

public sealed record TransferFailedData
{
    [JsonPropertyName("requestId")]
    public required Guid RequestId { get; init; }

    [JsonPropertyName("reason")]
    public required string Reason { get; init; }
}

public sealed record DevicesData
{
    [JsonPropertyName("devices")]
    public required IReadOnlyList<DeviceInfo> Devices { get; init; }

    [JsonPropertyName("discordDeviceId")]
    public Guid? DiscordDeviceId { get; init; }
}

public sealed record DeviceInfo
{
    [JsonPropertyName("deviceId")]
    public required Guid DeviceId { get; init; }

    [JsonPropertyName("name")]
    public required string Name { get; init; }

    [JsonPropertyName("sessions")]
    public required IReadOnlyList<DeviceSessionInfo> Sessions { get; init; }
}

public sealed record DeviceSessionInfo
{
    [JsonPropertyName("sessionId")]
    public required Guid SessionId { get; init; }

    [JsonPropertyName("state")]
    public PlaybackStateData? State { get; init; }

    // Unix milliseconds when State was received.
    [JsonPropertyName("stateUpdatedAt")]
    public required long StateUpdatedAt { get; init; }

    // Unix milliseconds when this session last started playing a track.
    [JsonPropertyName("activatedAt")]
    public required long ActivatedAt { get; init; }

    [JsonPropertyName("connectedAt")]
    public required long ConnectedAt { get; init; }
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
