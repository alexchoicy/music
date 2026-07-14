using System.Net.WebSockets;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Music.Core.Services.Tracks;
using Music.Core.Services.WebSockets;
using Music.Infrastructure.Discord;

namespace Music.Infrastructure.Services.WebSockets;

public sealed class WebSocketService(
    ITrackService trackService,
    DiscordPresenceManager discordPresenceManager,
    ILogger<WebSocketService> logger
)
{
    private const int MaxMessageSize = 16 * 1024;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, false) },
    };

    private sealed class ClientRoom(WebSocket leader)
    {
        public WebSocket Leader { get; set; } = leader;
        public HashSet<WebSocket> Members { get; } = [];
        public SemaphoreSlim SendLock { get; } = new(1, 1);
    }

    private static readonly Lock SocketLock = new();
    private static readonly Dictionary<string, ClientRoom> RoomsByUserId = [];

    public async Task HandleConnectionAsync(
        string userId,
        WebSocket socket,
        CancellationToken cancellationToken
    )
    {
        ClientRoom room = AddSocket(userId, socket);

        try
        {
            await ReceiveMessageAsync(userId, room, socket, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        { }
        catch (WebSocketException) { }
        finally
        {
            RemoveSocket(userId, room, socket);
        }
    }

    private static ClientRoom AddSocket(string userId, WebSocket socket)
    {
        lock (SocketLock)
        {
            if (!RoomsByUserId.TryGetValue(userId, out ClientRoom? room))
            {
                room = new ClientRoom(socket);
                RoomsByUserId.Add(userId, room);
            }
            else
            {
                room.Members.Add(socket);
            }

            return room;
        }
    }

    private void RemoveSocket(string userId, ClientRoom room, WebSocket socket)
    {
        lock (SocketLock)
        {
            if (
                !RoomsByUserId.TryGetValue(userId, out ClientRoom? currentRoom)
                || currentRoom != room
            )
                return;

            if (room.Leader != socket)
            {
                room.Members.Remove(socket);
                return;
            }

            if (room.Members.Count == 0)
            {
                RoomsByUserId.Remove(userId);
                discordPresenceManager.QueueClearPresence(userId);
                return;
            }

            room.Leader = room.Members.First();
            room.Members.Remove(room.Leader);
        }
    }

    private async Task ReceiveMessageAsync(
        string userId,
        ClientRoom room,
        WebSocket socket,
        CancellationToken cancellationToken
    )
    {
        while (socket.State == WebSocketState.Open)
        {
            byte[] buffer = new byte[MaxMessageSize];
            int length = 0;
            ValueWebSocketReceiveResult result;

            do
            {
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
                if (!result.EndOfMessage && length == buffer.Length)
                {
                    await socket.CloseOutputAsync(
                        WebSocketCloseStatus.MessageTooBig,
                        null,
                        cancellationToken
                    );
                    return;
                }
            } while (!result.EndOfMessage);

            ReadOnlyMemory<byte> payload = buffer.AsMemory(0, length);
            WebSocketMessage message;
            try
            {
                message =
                    JsonSerializer.Deserialize<WebSocketMessage>(payload.Span, JsonOptions)
                    ?? throw new JsonException("Message cannot be null.");
            }
            catch (Exception exception) when (exception is JsonException or ArgumentException)
            {
                continue;
            }

            bool shouldBroadcast;
            switch (message)
            {
                case MusicWebSocketMessage musicMessage:
                    shouldBroadcast = await HandleMusicMessageAsync(
                        room,
                        socket,
                        userId,
                        musicMessage,
                        cancellationToken
                    );
                    break;
                case ConcertWebSocketMessage:
                    shouldBroadcast = true;
                    break;
                case EventsWebSocketMessage:
                    shouldBroadcast = false;
                    break;
                default:
                    shouldBroadcast = false;
                    break;
            }

            if (!shouldBroadcast)
            {
                continue;
            }

            await BroadcastAsync(room, socket, payload, cancellationToken);
        }
    }

    private async Task<bool> HandleMusicMessageAsync(
        ClientRoom room,
        WebSocket sender,
        string userId,
        MusicWebSocketMessage message,
        CancellationToken cancellationToken
    )
    {
        lock (SocketLock)
        {
            if (
                !RoomsByUserId.TryGetValue(userId, out ClientRoom? currentRoom)
                || currentRoom != room
            )
                return false;

            if (
                message.Data.Action
                    is PlaybackAction.Play
                        or PlaybackAction.Pause
                        or PlaybackAction.ChangeTime
                && room.Leader != sender
            )
            {
                room.Members.Add(room.Leader);
                room.Members.Remove(sender);
                room.Leader = sender;
            }

            if (room.Leader != sender)
            {
                return false;
            }
        }

        await QueueDiscordPresenceAsync(userId, message.Data, cancellationToken);
        return true;
    }

    private async Task QueueDiscordPresenceAsync(
        string userId,
        PlaybackData playback,
        CancellationToken cancellationToken
    )
    {
        if (playback.Action is PlaybackAction.Pause or PlaybackAction.End)
        {
            discordPresenceManager.QueueClearPresence(userId);
            return;
        }

        if (!int.TryParse(playback.TrackID, out int trackId) || trackId <= 0)
        {
            return;
        }

        try
        {
            TrackPlaybackDetails? track = await trackService.GetPlaybackDetailsAsync(
                trackId,
                cancellationToken
            );
            if (track is null)
            {
                return;
            }

            long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            long position = Math.Min(playback.PositionMs, track.DurationInMs);
            DiscordActivityTimestamps? timestamps = playback.Action
                is PlaybackAction.Play
                    or PlaybackAction.Change
                    or PlaybackAction.ChangeTime
                ? new DiscordActivityTimestamps
                {
                    Start = now - position,
                    End = now - position + track.DurationInMs,
                }
                : null;

            DiscordActivity discordActivity = new()
            {
                Name = track.Title,
                Type = DiscordActivityType.Listening,
                Details = track.Title,
                State = track.Artists.Count == 0 ? null : string.Join(" • ", track.Artists),
                StatusDisplayType = DiscordStatusDisplayType.Details,
                Timestamps = timestamps,
                Assets = track.CoverUrl is null
                    ? null
                    : new DiscordActivityAssets
                    {
                        LargeImage = track.CoverUrl,
                        LargeText = track.AlbumTitle,
                    },
            };

            discordPresenceManager.QueuePresenceUpdate(userId, discordActivity);
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

    private static async Task BroadcastAsync(
        ClientRoom room,
        WebSocket sender,
        ReadOnlyMemory<byte> payload,
        CancellationToken cancellationToken
    )
    {
        List<WebSocket> recipients;
        lock (SocketLock)
        {
            recipients = [room.Leader, .. room.Members];
        }

        await room.SendLock.WaitAsync(cancellationToken);
        try
        {
            foreach (WebSocket recipient in recipients)
            {
                if (recipient != sender && recipient.State == WebSocketState.Open)
                {
                    try
                    {
                        await recipient.SendAsync(
                            payload,
                            WebSocketMessageType.Text,
                            true,
                            cancellationToken
                        );
                    }
                    catch (Exception exception)
                        when (exception is WebSocketException or ObjectDisposedException)
                    { }
                }
            }
        }
        finally
        {
            room.SendLock.Release();
        }
    }
}
