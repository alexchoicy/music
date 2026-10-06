using System.IdentityModel.Tokens.Jwt;
using System.Net.WebSockets;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Music.Core.Services.Auth;
using Music.Core.Services.Tracks;
using Music.Core.Services.WebSockets;
using Music.Infrastructure.Discord;

namespace Music.Infrastructure.Services.WebSockets;

// Connects the authenticated user's player sessions. A device ID only names a browser;
// every lookup is scoped to the user who authenticated the socket.
public sealed class WebSocketService(
    IServiceScopeFactory scopeFactory,
    DiscordPresenceManager discordPresenceManager,
    ILogger<WebSocketService> logger
)
{
    private const int InitialBufferSize = 16 * 1024;

    // Transfer snapshots carry the whole queue.
    private const int MaxMessageSize = 4 * 1024 * 1024;
    private const int MaxDeviceNameLength = 64;
    private const long PresenceStartToleranceMs = 2000;
    private static readonly TimeSpan AuthRevalidationInterval = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan SendTimeout = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan TransferTimeout = TimeSpan.FromMinutes(1);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, false) },
    };

    private sealed class PlaybackSession(
        WebSocket socket,
        Guid deviceId,
        Guid sessionId,
        string name
    )
    {
        public WebSocket Socket { get; } = socket;
        public Guid DeviceId { get; set; } = deviceId;
        public Guid SessionId { get; } = sessionId;
        public string Name { get; set; } = name;
        public PlaybackStateData? State { get; set; }
        public long StateUpdatedAt { get; set; }
        public long ActivatedAt { get; set; }
        public long ConnectedAt { get; } = Now();
    }

    private sealed class PendingTransfer(PlaybackSession source, PlaybackSession target)
    {
        public PlaybackSession Source { get; } = source;
        public PlaybackSession Target { get; } = target;
        public long CreatedAt { get; } = Now();
        public bool SnapshotSent { get; set; }
    }

    private sealed class UserRoom
    {
        public List<PlaybackSession> Sessions { get; } = [];
        public Dictionary<Guid, PendingTransfer> Transfers { get; } = [];
        public SemaphoreSlim SendLock { get; } = new(1, 1);
        public string? PresenceTrackId { get; set; }
        public long PresenceStart { get; set; }
        public long PresenceVersion { get; set; }
    }

    private sealed class Connection(string userId, ClaimsPrincipal principal, WebSocket socket)
    {
        public string UserId { get; } = userId;
        public ClaimsPrincipal Principal { get; } = principal;
        public WebSocket Socket { get; } = socket;
        public PlaybackSession? Session { get; set; }
        public UserRoom? Room { get; set; }

        // The handshake was authenticated by the API pipeline.
        public long AuthorizedAt { get; set; } = Now();
    }

    private static readonly Lock SocketLock = new();
    private static readonly Dictionary<string, UserRoom> RoomsByUserId = [];

    // Manual Discord presence device per user; absent means the most recently started session.
    private static readonly Dictionary<string, Guid> DiscordDeviceByUserId = [];

    public async Task HandleConnectionAsync(
        string userId,
        ClaimsPrincipal principal,
        WebSocket socket,
        CancellationToken cancellationToken
    )
    {
        Connection connection = new(userId, principal, socket);

        try
        {
            await ReceiveMessagesAsync(connection, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { }
        catch (WebSocketException) { }
        finally
        {
            await RemoveSessionAsync(connection);
        }
    }

    private async Task ReceiveMessagesAsync(
        Connection connection,
        CancellationToken cancellationToken
    )
    {
        WebSocket socket = connection.Socket;
        byte[] buffer = new byte[InitialBufferSize];

        while (socket.State == WebSocketState.Open)
        {
            int length = 0;
            ValueWebSocketReceiveResult result;

            do
            {
                if (length == buffer.Length)
                {
                    if (buffer.Length >= MaxMessageSize)
                    {
                        await socket.CloseOutputAsync(
                            WebSocketCloseStatus.MessageTooBig,
                            null,
                            cancellationToken
                        );
                        return;
                    }

                    Array.Resize(ref buffer, Math.Min(buffer.Length * 2, MaxMessageSize));
                }

                result = await socket.ReceiveAsync(buffer.AsMemory(length), cancellationToken);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await socket.CloseOutputAsync(
                        socket.CloseStatus ?? WebSocketCloseStatus.NormalClosure,
                        socket.CloseStatusDescription,
                        cancellationToken
                    );
                    return;
                }

                if (result.MessageType != WebSocketMessageType.Text)
                {
                    await socket.CloseOutputAsync(
                        WebSocketCloseStatus.InvalidMessageType,
                        null,
                        cancellationToken
                    );
                    return;
                }

                length += result.Count;
            } while (!result.EndOfMessage);

            ReadOnlyMemory<byte> payload = buffer.AsMemory(0, length);
            WebSocketMessage? message;
            try
            {
                message = JsonSerializer.Deserialize<WebSocketMessage>(payload.Span, JsonOptions);
            }
            catch (Exception exception) when (exception is JsonException or ArgumentException)
            {
                message = null;
            }

            if (message is not null)
            {
                if (connection.Session is null && message is not RegisterDeviceWebSocketMessage)
                {
                    continue;
                }

                // Playback reports are frequent; anything that registers or controls a session is checked every time.
                bool forceAuthorization =
                    message
                    is not PlaybackStateWebSocketMessage
                        and not ConcertWebSocketMessage
                        and not EventsWebSocketMessage;
                if (!await EnsureAuthorizedAsync(connection, forceAuthorization, cancellationToken))
                {
                    await socket.CloseOutputAsync(
                        WebSocketCloseStatus.PolicyViolation,
                        "Authentication expired.",
                        cancellationToken
                    );
                    return;
                }

                await HandleMessageAsync(connection, message, payload, cancellationToken);
            }

            if (buffer.Length > InitialBufferSize)
            {
                buffer = new byte[InitialBufferSize];
            }
        }
    }

    private async Task<bool> EnsureAuthorizedAsync(
        Connection connection,
        bool force,
        CancellationToken cancellationToken
    )
    {
        long now = Now();
        if (
            long.TryParse(
                connection.Principal.FindFirstValue(JwtRegisteredClaimNames.Exp),
                out long expiresAtSeconds
            )
            && expiresAtSeconds * 1000 <= now
        )
        {
            return false;
        }

        if (!force && now - connection.AuthorizedAt < AuthRevalidationInterval.TotalMilliseconds)
        {
            return true;
        }

        // A fresh scope so revocations made by other requests are not hidden by a long-lived DbContext.
        await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();
        ITokenService tokenService = scope.ServiceProvider.GetRequiredService<ITokenService>();
        if (!await tokenService.ValidateTokenAsync(connection.Principal, cancellationToken))
        {
            return false;
        }

        connection.AuthorizedAt = now;
        return true;
    }

    private async Task HandleMessageAsync(
        Connection connection,
        WebSocketMessage message,
        ReadOnlyMemory<byte> payload,
        CancellationToken cancellationToken
    )
    {
        switch (message)
        {
            case RegisterDeviceWebSocketMessage register:
                await RegisterAsync(connection, register.Data, cancellationToken);
                break;
            case PlaybackStateWebSocketMessage state:
                await UpdateStateAsync(connection, state.Data, cancellationToken);
                break;
            case DeviceControlWebSocketMessage control:
                await ControlAsync(connection, control.Data);
                break;
            case DiscordDeviceWebSocketMessage discordDevice:
                await SelectDiscordDeviceAsync(connection, discordDevice.Data, cancellationToken);
                break;
            case TransferWebSocketMessage transfer:
                await RequestTransferAsync(connection, transfer.Data);
                break;
            case TransferSnapshotWebSocketMessage snapshot:
                await RelayTransferSnapshotAsync(connection, snapshot.Data);
                break;
            case TransferResultWebSocketMessage transferResult:
                await CompleteTransferAsync(connection, transferResult.Data);
                break;
            case ConcertWebSocketMessage:
                await BroadcastPayloadAsync(connection, payload);
                break;
        }
    }

    private async Task RegisterAsync(
        Connection connection,
        RegisterDeviceData data,
        CancellationToken cancellationToken
    )
    {
        string name = NormalizeDeviceName(data.Name);
        UserRoom room;

        lock (SocketLock)
        {
            if (connection.Session is { } existing)
            {
                // A tab keeps its session; its device ID can change when another tab
                // of the same browser stored a different one first.
                if (existing.SessionId != data.SessionId)
                {
                    return;
                }

                existing.DeviceId = data.DeviceId;
                room = connection.Room!;
            }
            else
            {
                if (!RoomsByUserId.TryGetValue(connection.UserId, out UserRoom? currentRoom))
                {
                    currentRoom = new UserRoom();
                    RoomsByUserId.Add(connection.UserId, currentRoom);
                }

                if (currentRoom.Sessions.Any(session => session.SessionId == data.SessionId))
                {
                    return;
                }

                PlaybackSession session = new(
                    connection.Socket,
                    data.DeviceId,
                    data.SessionId,
                    name
                );
                currentRoom.Sessions.Add(session);
                connection.Session = session;
                connection.Room = currentRoom;
                room = currentRoom;
            }

            foreach (PlaybackSession session in room.Sessions)
            {
                if (session.DeviceId == data.DeviceId)
                {
                    session.Name = name;
                }
            }
        }

        await BroadcastDevicesAsync(connection.UserId, room);
        await UpdateDiscordPresenceAsync(connection.UserId, cancellationToken);
    }

    private async Task UpdateStateAsync(
        Connection connection,
        PlaybackStateData state,
        CancellationToken cancellationToken
    )
    {
        PlaybackSession session = connection.Session!;
        lock (SocketLock)
        {
            PlaybackStateData? previous = session.State;
            long now = Now();
            if (
                state.Status == PlaybackStatus.Playing
                && (
                    previous?.Status != PlaybackStatus.Playing
                    || previous.Track?.TrackId != state.Track?.TrackId
                )
            )
            {
                session.ActivatedAt = now;
            }

            session.State = state;
            session.StateUpdatedAt = now;
        }

        await BroadcastDevicesAsync(connection.UserId, connection.Room!);
        await UpdateDiscordPresenceAsync(connection.UserId, cancellationToken);
    }

    private async Task ControlAsync(Connection connection, DeviceControlData data)
    {
        PlaybackSession? target;
        lock (SocketLock)
        {
            target = FindSession(connection, data.DeviceId, data.SessionId);
        }

        if (target is null)
        {
            return;
        }

        await SendAsync(
            connection.Room!,
            [target],
            new DeviceControlServerMessage { Data = new() { Action = data.Action } }
        );
    }

    private async Task SelectDiscordDeviceAsync(
        Connection connection,
        DiscordDeviceData data,
        CancellationToken cancellationToken
    )
    {
        lock (SocketLock)
        {
            if (data.DeviceId is not { } deviceId)
            {
                DiscordDeviceByUserId.Remove(connection.UserId);
            }
            else if (connection.Room!.Sessions.Any(session => session.DeviceId == deviceId))
            {
                DiscordDeviceByUserId[connection.UserId] = deviceId;
            }
            else
            {
                return;
            }
        }

        await BroadcastDevicesAsync(connection.UserId, connection.Room!);
        await UpdateDiscordPresenceAsync(connection.UserId, cancellationToken);
    }

    private async Task RequestTransferAsync(Connection connection, TransferData data)
    {
        UserRoom room = connection.Room!;
        PlaybackSession target = connection.Session!;
        PlaybackSession? source;

        lock (SocketLock)
        {
            long now = Now();
            foreach (
                Guid requestId in room
                    .Transfers.Where(item =>
                        now - item.Value.CreatedAt > TransferTimeout.TotalMilliseconds
                    )
                    .Select(item => item.Key)
                    .ToArray()
            )
            {
                room.Transfers.Remove(requestId);
            }

            source = FindSession(connection, data.DeviceId, data.SessionId);
            if (source is not null && !room.Transfers.TryAdd(data.RequestId, new(source, target)))
            {
                return;
            }
        }

        if (source is null)
        {
            await SendAsync(
                room,
                [target],
                new TransferFailedServerMessage
                {
                    Data = new()
                    {
                        RequestId = data.RequestId,
                        Reason = "That device is no longer connected.",
                    },
                }
            );
            return;
        }

        await SendAsync(
            room,
            [source],
            new TransferSnapshotRequestServerMessage
            {
                Data = new() { RequestId = data.RequestId, DeviceName = target.Name },
            }
        );
    }

    private async Task RelayTransferSnapshotAsync(Connection connection, TransferSnapshotData data)
    {
        UserRoom room = connection.Room!;
        PendingTransfer? transfer;
        bool hasSnapshot = data.Snapshot is { ValueKind: JsonValueKind.Object };

        lock (SocketLock)
        {
            if (
                !room.Transfers.TryGetValue(data.RequestId, out transfer)
                || transfer.Source != connection.Session
                || transfer.SnapshotSent
            )
            {
                return;
            }

            if (hasSnapshot)
            {
                transfer.SnapshotSent = true;
            }
            else
            {
                room.Transfers.Remove(data.RequestId);
            }
        }

        await SendAsync(
            room,
            [transfer.Target],
            hasSnapshot
                ? new TransferSnapshotServerMessage { Data = data }
                : new TransferFailedServerMessage
                {
                    Data = new()
                    {
                        RequestId = data.RequestId,
                        Reason = "Nothing is playing on that device.",
                    },
                }
        );
    }

    private async Task CompleteTransferAsync(Connection connection, TransferResultData data)
    {
        UserRoom room = connection.Room!;
        PendingTransfer? transfer;

        lock (SocketLock)
        {
            if (
                !room.Transfers.TryGetValue(data.RequestId, out transfer)
                || transfer.Target != connection.Session
            )
            {
                return;
            }

            room.Transfers.Remove(data.RequestId);
        }

        // The source keeps playing unless this device confirms that it is ready.
        if (!data.Success || !transfer.SnapshotSent)
        {
            return;
        }

        await SendAsync(
            room,
            [transfer.Source],
            new TransferReleaseServerMessage { Data = new() { RequestId = data.RequestId } }
        );
    }

    private async Task RemoveSessionAsync(Connection connection)
    {
        if (connection.Session is not { } session || connection.Room is not { } room)
        {
            return;
        }

        List<(PlaybackSession Target, Guid RequestId)> failedTransfers = [];
        bool roomRemoved = false;

        lock (SocketLock)
        {
            room.Sessions.Remove(session);
            foreach ((Guid requestId, PendingTransfer transfer) in room.Transfers.ToArray())
            {
                if (transfer.Source != session && transfer.Target != session)
                {
                    continue;
                }

                room.Transfers.Remove(requestId);
                if (transfer.Source == session)
                {
                    failedTransfers.Add((transfer.Target, requestId));
                }
            }

            if (
                room.Sessions.Count == 0
                && RoomsByUserId.TryGetValue(connection.UserId, out UserRoom? currentRoom)
                && currentRoom == room
            )
            {
                RoomsByUserId.Remove(connection.UserId);
                roomRemoved = true;
            }
        }

        if (roomRemoved)
        {
            discordPresenceManager.QueueClearPresence(connection.UserId);
            return;
        }

        foreach ((PlaybackSession target, Guid requestId) in failedTransfers)
        {
            await SendAsync(
                room,
                [target],
                new TransferFailedServerMessage
                {
                    Data = new() { RequestId = requestId, Reason = "That device disconnected." },
                }
            );
        }

        await BroadcastDevicesAsync(connection.UserId, room);
        await UpdateDiscordPresenceAsync(connection.UserId, CancellationToken.None);
    }

    private static PlaybackSession? FindSession(
        Connection connection,
        Guid deviceId,
        Guid sessionId
    ) =>
        connection.Room!.Sessions.FirstOrDefault(session =>
            session.SessionId == sessionId
            && session.DeviceId == deviceId
            && session != connection.Session
        );

    private async Task UpdateDiscordPresenceAsync(
        string userId,
        CancellationToken cancellationToken
    )
    {
        UserRoom? room;
        PlaybackStateData? state;
        long start;
        long version;

        lock (SocketLock)
        {
            if (!RoomsByUserId.TryGetValue(userId, out room))
            {
                return;
            }

            IEnumerable<PlaybackSession> candidates = DiscordDeviceByUserId.TryGetValue(
                userId,
                out Guid deviceId
            )
                ? room.Sessions.Where(session => session.DeviceId == deviceId)
                : room.Sessions;
            PlaybackSession? source = candidates
                .Where(session =>
                    session.State is { Status: PlaybackStatus.Playing, Track: not null }
                )
                .MaxBy(session => session.ActivatedAt);

            state = source?.State;
            start = source is null ? 0 : source.StateUpdatedAt - state!.PositionMs;
            string? trackId = state?.Track?.TrackId;
            if (
                trackId == room.PresenceTrackId
                && (
                    trackId is null
                    || Math.Abs(start - room.PresenceStart) < PresenceStartToleranceMs
                )
            )
            {
                return;
            }

            room.PresenceTrackId = trackId;
            room.PresenceStart = start;
            version = ++room.PresenceVersion;
        }

        if (state?.Track is not { } playingTrack)
        {
            discordPresenceManager.QueueClearPresence(userId);
            return;
        }

        if (!int.TryParse(playingTrack.TrackId, out int trackDbId) || trackDbId <= 0)
        {
            return;
        }

        try
        {
            await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();
            ITrackService trackService = scope.ServiceProvider.GetRequiredService<ITrackService>();
            TrackPlaybackDetails? track = await trackService.GetPlaybackDetailsAsync(
                trackDbId,
                cancellationToken
            );
            if (track is null)
            {
                return;
            }

            start = Math.Max(start, Now() - track.DurationInMs);
            DiscordActivity discordActivity = new()
            {
                Name = track.Title,
                Type = DiscordActivityType.Listening,
                Details = track.Title,
                State = track.Artists.Count == 0 ? null : string.Join(" • ", track.Artists),
                StatusDisplayType = DiscordStatusDisplayType.Details,
                Timestamps = new DiscordActivityTimestamps
                {
                    Start = start,
                    End = start + track.DurationInMs,
                },
                Assets = track.CoverUrl is null
                    ? null
                    : new DiscordActivityAssets
                    {
                        LargeImage = track.CoverUrl,
                        LargeText = track.AlbumTitle,
                    },
            };

            lock (SocketLock)
            {
                // A newer playback change superseded this lookup.
                if (
                    !RoomsByUserId.TryGetValue(userId, out UserRoom? currentRoom)
                    || currentRoom != room
                    || room.PresenceVersion != version
                )
                {
                    return;
                }

                discordPresenceManager.QueuePresenceUpdate(userId, discordActivity);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                exception,
                "Discord presence metadata lookup failed for user {UserId}.",
                userId
            );
        }
    }

    private async Task BroadcastDevicesAsync(string userId, UserRoom room)
    {
        List<PlaybackSession> recipients;
        DevicesServerMessage message;

        lock (SocketLock)
        {
            recipients = [.. room.Sessions];
            message = new DevicesServerMessage
            {
                Data = new()
                {
                    Devices =
                    [
                        .. room
                            .Sessions.GroupBy(session => session.DeviceId)
                            .Select(device => new DeviceInfo
                            {
                                DeviceId = device.Key,
                                Name = device.MaxBy(session => session.ConnectedAt)!.Name,
                                Sessions =
                                [
                                    .. device.Select(session => new DeviceSessionInfo
                                    {
                                        SessionId = session.SessionId,
                                        State = session.State,
                                        StateUpdatedAt = session.StateUpdatedAt,
                                        ActivatedAt = session.ActivatedAt,
                                        ConnectedAt = session.ConnectedAt,
                                    }),
                                ],
                            }),
                    ],
                    DiscordDeviceId = DiscordDeviceByUserId.TryGetValue(userId, out Guid deviceId)
                        ? deviceId
                        : null,
                },
            };
        }

        await SendAsync(room, recipients, message);
    }

    private async Task BroadcastPayloadAsync(Connection connection, ReadOnlyMemory<byte> payload)
    {
        List<WebSocket> recipients;
        lock (SocketLock)
        {
            recipients =
            [
                .. connection
                    .Room!.Sessions.Where(session => session != connection.Session)
                    .Select(session => session.Socket),
            ];
        }

        await SendPayloadAsync(connection.Room!, recipients, payload);
    }

    private static Task SendAsync(
        UserRoom room,
        IReadOnlyList<PlaybackSession> recipients,
        WebSocketServerMessage message
    ) =>
        SendPayloadAsync(
            room,
            [.. recipients.Select(session => session.Socket)],
            JsonSerializer.SerializeToUtf8Bytes(message, JsonOptions)
        );

    private static async Task SendPayloadAsync(
        UserRoom room,
        IReadOnlyList<WebSocket> recipients,
        ReadOnlyMemory<byte> payload
    )
    {
        if (recipients.Count == 0)
        {
            return;
        }

        using CancellationTokenSource timeout = new(SendTimeout);
        try
        {
            await room.SendLock.WaitAsync(timeout.Token);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        try
        {
            foreach (WebSocket recipient in recipients)
            {
                if (recipient.State != WebSocketState.Open)
                {
                    continue;
                }

                try
                {
                    await recipient.SendAsync(
                        payload,
                        WebSocketMessageType.Text,
                        true,
                        timeout.Token
                    );
                }
                catch (Exception exception)
                    when (exception
                            is WebSocketException
                                or ObjectDisposedException
                                or OperationCanceledException
                    ) { }
            }
        }
        finally
        {
            room.SendLock.Release();
        }
    }

    private static string NormalizeDeviceName(string name)
    {
        string trimmed = name.Trim();
        if (trimmed.Length == 0)
        {
            return "Unnamed device";
        }

        return trimmed.Length <= MaxDeviceNameLength
            ? trimmed
            : trimmed[..MaxDeviceNameLength].TrimEnd();
    }

    private static long Now() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}
