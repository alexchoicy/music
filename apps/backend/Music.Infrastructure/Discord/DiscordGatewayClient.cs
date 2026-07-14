using System.Buffers;
using System.Diagnostics;
using System.Net.Http.Json;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Channels;
using Microsoft.Extensions.Logging;

namespace Music.Infrastructure.Discord;

// HEY DISCORD BROZ DON"T BAN ME QAQ.
internal sealed class DiscordGatewayClient : IAsyncDisposable
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };
    private static readonly TimeSpan CoalesceDelay = TimeSpan.FromSeconds(2);
    private static readonly TimeSpan PresenceRateLimitWindow = TimeSpan.FromSeconds(20);
    private static readonly TimeSpan ClearedPresenceTimeout = TimeSpan.FromMinutes(2);
    private const int ActivityTextLimit = 128;

    private readonly HttpClient _httpClient;
    private readonly DiscordExternalAssetService _externalAssetService;
    private readonly string _applicationId;
    private readonly string _token;
    private readonly string _userId;
    private readonly ILogger<DiscordGatewayClient> _logger;
    private readonly Channel<PresenceUpdate> _presenceUpdates =
        Channel.CreateBounded<PresenceUpdate>(
            new BoundedChannelOptions(1)
            {
                FullMode = BoundedChannelFullMode.DropOldest,
                SingleReader = true,
                SingleWriter = false,
            }
        );
    private readonly Queue<long> _presenceSentAt = new(5);
    private readonly CancellationTokenSource _shutdown = new();
    private readonly SemaphoreSlim _sendLock = new(1, 1);
    private readonly Lock _stateLock = new();
    private readonly Task _workerTask;

    private ClientWebSocket? _webSocket;
    private Task? _connectionTask;
    private Uri? _gatewayUrl;
    private long _presenceClearedAt;
    private long _idleSince;
    private bool _gatewayDisabled;

    public DiscordGatewayClient(
        HttpClient httpClient,
        DiscordExternalAssetService externalAssetService,
        string applicationId,
        string token,
        string userId,
        ILogger<DiscordGatewayClient> logger
    )
    {
        _httpClient = httpClient;
        _externalAssetService = externalAssetService;
        _applicationId = applicationId;
        _token = token;
        _userId = userId;
        _logger = logger;
        _workerTask = ProcessPresenceUpdatesAsync(_shutdown.Token);
    }

    public bool QueuePresenceUpdate(DiscordActivity activity)
    {
        lock (_stateLock)
        {
            if (_gatewayDisabled)
            {
                return false;
            }

            if (!_presenceUpdates.Writer.TryWrite(new PresenceUpdate(activity)))
            {
                return false;
            }

            _presenceClearedAt = 0;
            return true;
        }
    }

    public bool QueueClearPresence()
    {
        lock (_stateLock)
        {
            if (_gatewayDisabled)
            {
                return false;
            }

            if (!_presenceUpdates.Writer.TryWrite(new PresenceUpdate(null)))
            {
                return false;
            }

            return true;
        }
    }

    private async Task ProcessPresenceUpdatesAsync(CancellationToken cancellationToken)
    {
        try
        {
            await foreach (
                PresenceUpdate queuedUpdate in _presenceUpdates.Reader.ReadAllAsync(
                    cancellationToken
                )
            )
            {
                PresenceUpdate update = queuedUpdate;
                await Task.Delay(CoalesceDelay, cancellationToken);
                DrainLatestPresence(ref update);
                await WaitForPresenceRateLimitAsync(cancellationToken);

                ClientWebSocket? socket = await EnsureConnectedAsync(cancellationToken);
                if (socket is null)
                {
                    continue;
                }

                DrainLatestPresence(ref update);
                long idleSince;
                lock (_stateLock)
                {
                    idleSince = GetIdleSince();
                }
                try
                {
                    DiscordActivity? activity = update.Activity;
                    if (activity is not null)
                    {
                        activity = await RewriteExternalAssetsAsync(activity, cancellationToken);
                    }

                    await SendAsync(
                        socket,
                        CreatePresencePayload(activity, idleSince),
                        cancellationToken
                    );
                    _presenceSentAt.Enqueue(Stopwatch.GetTimestamp());
                    lock (_stateLock)
                    {
                        _presenceClearedAt = activity is null ? Stopwatch.GetTimestamp() : 0;
                    }
                }
                catch (Exception exception)
                    when (exception is WebSocketException or InvalidOperationException)
                {
                    _logger.LogWarning(
                        exception,
                        "Discord presence update failed for user {UserId}; the connection was discarded.",
                        _userId
                    );
                    socket.Abort();
                }
            }
        }
        catch (Exception) when (cancellationToken.IsCancellationRequested) { }
    }

    private void DrainLatestPresence(ref PresenceUpdate update)
    {
        while (_presenceUpdates.Reader.TryRead(out PresenceUpdate? latestUpdate))
        {
            update = latestUpdate;
        }
    }

    private long GetIdleSince()
    {
        if (_idleSince == 0)
        {
            _idleSince = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }

        return _idleSince;
    }

    private async Task<DiscordActivity> RewriteExternalAssetsAsync(
        DiscordActivity activity,
        CancellationToken cancellationToken
    )
    {
        if (activity.Assets is not { } assets)
        {
            return activity;
        }

        return activity with
        {
            Assets = assets with
            {
                LargeImage = await _externalAssetService.GetMediaProxyPathAsync(
                    _applicationId,
                    _token,
                    _userId,
                    assets.LargeImage,
                    cancellationToken
                ),
                SmallImage = await _externalAssetService.GetMediaProxyPathAsync(
                    _applicationId,
                    _token,
                    _userId,
                    assets.SmallImage,
                    cancellationToken
                ),
            },
        };
    }

    private async Task WaitForPresenceRateLimitAsync(CancellationToken cancellationToken)
    {
        while (_presenceSentAt.Count >= 5)
        {
            TimeSpan wait =
                PresenceRateLimitWindow - Stopwatch.GetElapsedTime(_presenceSentAt.Peek());
            if (wait > TimeSpan.Zero)
            {
                await Task.Delay(wait, cancellationToken);
            }

            _presenceSentAt.Dequeue();
        }
    }

    private async Task<ClientWebSocket?> EnsureConnectedAsync(CancellationToken cancellationToken)
    {
        lock (_stateLock)
        {
            if (_gatewayDisabled)
            {
                return null;
            }

            if (_webSocket?.State == WebSocketState.Open)
            {
                return _webSocket;
            }
        }

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(30));

        ClientWebSocket? socket = null;
        bool connectionStarted = false;
        try
        {
            if (_connectionTask is not null)
            {
                await _connectionTask.WaitAsync(timeout.Token);
                _connectionTask = null;
            }

            lock (_stateLock)
            {
                if (_gatewayDisabled)
                {
                    return null;
                }
            }

            _gatewayUrl ??= await GetGatewayUrlAsync(timeout.Token);
            if (_gatewayUrl is null)
            {
                _logger.LogWarning(
                    "Discord gateway request failed for user {UserId}; presence update was skipped.",
                    _userId
                );
                return null;
            }

            socket = new ClientWebSocket();
            var connectionUrl = new UriBuilder(_gatewayUrl) { Query = "v=9&encoding=json" }.Uri;

            await socket.ConnectAsync(connectionUrl, timeout.Token);

            GatewayReceiveResult hello = await ReceiveMessageAsync(socket, timeout.Token);
            if (hello.Message is null)
            {
                HandleGatewayClose(hello);
                throw new InvalidOperationException("Discord did not send a valid Hello event.");
            }

            TimeSpan heartbeatInterval =
                GetHeartbeatInterval(hello.Message)
                ?? throw new InvalidOperationException("Discord did not send a valid Hello event.");

            var state = new ConnectionState();
            await SendHeartbeatAsync(socket, state, timeout.Token);
            await SendAsync(socket, CreateIdentifyPayload(_token), timeout.Token);

            var ready = new TaskCompletionSource<bool>(
                TaskCreationOptions.RunContinuationsAsynchronously
            );
            lock (_stateLock)
            {
                _webSocket = socket;
            }
            _connectionTask = RunConnectionAsync(
                socket,
                heartbeatInterval,
                state,
                ready,
                _shutdown.Token
            );
            connectionStarted = true;

            await ready.Task.WaitAsync(timeout.Token);
            lock (_stateLock)
            {
                if (ReferenceEquals(_webSocket, socket))
                {
                    _idleSince = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                }
            }
            return socket;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            socket?.Abort();
            return null;
        }
        catch (Exception exception)
        {
            _gatewayUrl = null;
            socket?.Abort();
            _logger.LogWarning(
                exception,
                "Discord gateway connection failed for user {UserId}; update was skipped.",
                _userId
            );
            return null;
        }
        finally
        {
            if (!connectionStarted)
            {
                socket?.Dispose();
            }
        }
    }

    private async Task RunConnectionAsync(
        ClientWebSocket socket,
        TimeSpan heartbeatInterval,
        ConnectionState state,
        TaskCompletionSource<bool> ready,
        CancellationToken cancellationToken
    )
    {
        Task<GatewayReceiveResult>? receiveTask = null;
        try
        {
            receiveTask = ReceiveMessageAsync(socket, cancellationToken);
            Task heartbeatTask = Task.Delay(heartbeatInterval, cancellationToken);

            while (socket.State == WebSocketState.Open)
            {
                await Task.WhenAny(receiveTask, heartbeatTask);
                if (receiveTask.IsCompleted)
                {
                    GatewayReceiveResult result = await receiveTask;
                    if (result.Message is null)
                    {
                        HandleGatewayClose(result);
                        return;
                    }

                    GatewayAction action = await HandleGatewayMessageAsync(
                        socket,
                        result.Message,
                        state,
                        ready,
                        cancellationToken
                    );
                    if (action == GatewayAction.Stop)
                    {
                        return;
                    }

                    receiveTask = ReceiveMessageAsync(socket, cancellationToken);
                    if (!heartbeatTask.IsCompleted)
                    {
                        continue;
                    }
                }

                await heartbeatTask;

                if (TryDetachClearedSocket(socket, out long idleSince))
                {
                    await SendAsync(
                        socket,
                        CreatePresencePayload(null, idleSince),
                        cancellationToken
                    );
                    await CloseOutputAsync(socket, cancellationToken);
                    await WaitForCloseAsync(receiveTask, cancellationToken);
                    return;
                }

                if (!state.HeartbeatAcknowledged)
                {
                    _logger.LogWarning(
                        "Discord heartbeat for user {UserId} was not acknowledged; connection was discarded.",
                        _userId
                    );
                    return;
                }

                await SendHeartbeatAsync(socket, state, cancellationToken);
                heartbeatTask = Task.Delay(heartbeatInterval, cancellationToken);
            }
        }
        catch (Exception) when (cancellationToken.IsCancellationRequested)
        {
            ready.TrySetCanceled(cancellationToken);
        }
        catch (Exception exception)
        {
            ready.TrySetException(exception);
            _logger.LogWarning(
                exception,
                "Discord gateway connection for user {UserId} closed unexpectedly.",
                _userId
            );
        }
        finally
        {
            ready.TrySetException(new WebSocketException("Discord closed before READY."));

            if (socket.State != WebSocketState.Closed)
            {
                socket.Abort();
            }

            if (receiveTask is not null)
            {
                try
                {
                    await receiveTask;
                }
                catch (Exception) { }
            }

            socket.Dispose();
            lock (_stateLock)
            {
                if (ReferenceEquals(_webSocket, socket))
                {
                    _webSocket = null;
                }

                _idleSince = 0;
                _presenceClearedAt = 0;
            }
        }
    }

    private async Task<GatewayAction> HandleGatewayMessageAsync(
        ClientWebSocket socket,
        string message,
        ConnectionState state,
        TaskCompletionSource<bool> ready,
        CancellationToken cancellationToken
    )
    {
        using JsonDocument document = JsonDocument.Parse(message);
        JsonElement root = document.RootElement;

        if (
            root.TryGetProperty("s", out JsonElement sequence)
            && sequence.ValueKind == JsonValueKind.Number
        )
        {
            state.Sequence = sequence.GetInt64();
        }

        if (!root.TryGetProperty("op", out JsonElement opcode))
        {
            return GatewayAction.Continue;
        }

        switch (opcode.GetInt32())
        {
            case 0:
                if (
                    root.TryGetProperty("t", out JsonElement eventName)
                    && eventName.GetString() == "READY"
                )
                {
                    ready.TrySetResult(true);
                }
                break;
            case 1:
                await SendHeartbeatAsync(
                    socket,
                    state,
                    cancellationToken,
                    trackAcknowledgement: false
                );
                break;
            case 7:
            case 9:
                return GatewayAction.Stop;
            case 11:
                state.HeartbeatAcknowledged = true;
                break;
        }

        return GatewayAction.Continue;
    }

    private bool TryDetachClearedSocket(ClientWebSocket socket, out long idleSince)
    {
        lock (_stateLock)
        {
            if (
                _presenceClearedAt <= 0
                || Stopwatch.GetElapsedTime(_presenceClearedAt) < ClearedPresenceTimeout
            )
            {
                idleSince = 0;
                return false;
            }

            idleSince = GetIdleSince();
            if (ReferenceEquals(_webSocket, socket))
            {
                _webSocket = null;
            }

            return true;
        }
    }

    private async Task SendHeartbeatAsync(
        ClientWebSocket socket,
        ConnectionState state,
        CancellationToken cancellationToken,
        bool trackAcknowledgement = true
    )
    {
        if (trackAcknowledgement)
        {
            state.HeartbeatAcknowledged = false;
        }

        await SendAsync(
            socket,
            JsonSerializer.Serialize(
                new { op = 1, d = state.Sequence < 0 ? (long?)null : state.Sequence }
            ),
            cancellationToken
        );
    }

    private async Task SendAsync(
        ClientWebSocket socket,
        string payload,
        CancellationToken cancellationToken
    )
    {
        await _sendLock.WaitAsync(cancellationToken);
        try
        {
            await socket.SendAsync(
                Encoding.UTF8.GetBytes(payload),
                WebSocketMessageType.Text,
                true,
                cancellationToken
            );
        }
        finally
        {
            _sendLock.Release();
        }
    }

    private async Task CloseOutputAsync(ClientWebSocket socket, CancellationToken cancellationToken)
    {
        await _sendLock.WaitAsync(cancellationToken);
        try
        {
            await socket.CloseOutputAsync(
                WebSocketCloseStatus.NormalClosure,
                "Inactive",
                cancellationToken
            );
        }
        finally
        {
            _sendLock.Release();
        }
    }

    private async Task WaitForCloseAsync(
        Task<GatewayReceiveResult> receiveTask,
        CancellationToken cancellationToken
    )
    {
        try
        {
            GatewayReceiveResult result = await receiveTask.WaitAsync(
                TimeSpan.FromSeconds(5),
                cancellationToken
            );
            HandleGatewayClose(result);
        }
        catch (TimeoutException) { }
    }

    private async Task<GatewayReceiveResult> ReceiveMessageAsync(
        ClientWebSocket socket,
        CancellationToken cancellationToken
    )
    {
        var buffer = new ArrayBufferWriter<byte>();
        ValueWebSocketReceiveResult result;
        do
        {
            Memory<byte> memory = buffer.GetMemory(4096);
            result = await socket.ReceiveAsync(memory, cancellationToken);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                return new GatewayReceiveResult(
                    null,
                    (int?)socket.CloseStatus,
                    socket.CloseStatusDescription
                );
            }

            buffer.Advance(result.Count);
        } while (!result.EndOfMessage);

        return new GatewayReceiveResult(Encoding.UTF8.GetString(buffer.WrittenSpan), null, null);
    }

    private void HandleGatewayClose(GatewayReceiveResult result)
    {
        if (result.CloseCode is null)
        {
            return;
        }

        bool terminal = result.CloseCode is 4004 or (>= 4010 and <= 4014);
        if (terminal)
        {
            lock (_stateLock)
            {
                _gatewayDisabled = true;
            }

            _logger.LogWarning(
                "Discord gateway disabled for user {UserId} after terminal close {CloseCode}: {CloseDescription}",
                _userId,
                result.CloseCode,
                result.CloseDescription
            );
            return;
        }

        if (result.CloseCode is 1000 or 1001)
        {
            _logger.LogInformation(
                "Discord gateway closed for user {UserId} with status {CloseCode}: {CloseDescription}",
                _userId,
                result.CloseCode,
                result.CloseDescription
            );
        }
        else
        {
            _logger.LogWarning(
                "Discord gateway closed for user {UserId} with status {CloseCode}: {CloseDescription}",
                _userId,
                result.CloseCode,
                result.CloseDescription
            );
        }
    }

    private async Task<Uri?> GetGatewayUrlAsync(CancellationToken cancellationToken)
    {
        try
        {
            GatewayResponse? gateway = await _httpClient.GetFromJsonAsync<GatewayResponse>(
                "https://discord.com/api/gateway",
                cancellationToken
            );

            return Uri.TryCreate(gateway?.Url, UriKind.Absolute, out Uri? gatewayUrl)
                ? gatewayUrl
                : null;
        }
        catch (Exception exception)
            when (exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            return null;
        }
    }

    private static TimeSpan? GetHeartbeatInterval(string hello)
    {
        using JsonDocument document = JsonDocument.Parse(hello);
        JsonElement root = document.RootElement;
        if (
            !root.TryGetProperty("op", out JsonElement opcode)
            || opcode.GetInt32() != 10
            || !root.TryGetProperty("d", out JsonElement data)
            || !data.TryGetProperty("heartbeat_interval", out JsonElement interval)
            || interval.GetInt32() <= 0
        )
        {
            return null;
        }

        return TimeSpan.FromMilliseconds(interval.GetInt32());
    }

    private static string CreateIdentifyPayload(string token) =>
        JsonSerializer.Serialize(
            new
            {
                op = 2,
                d = new
                {
                    token,
                    intents = 0,
                    properties = new
                    {
                        os = "Windows",
                        browser = "Discord Client",
                        device = "Discord Client",
                    },
                },
            }
        );

    private string CreatePresencePayload(DiscordActivity? activity, long idleSince)
    {
        DiscordActivity[] activities = activity is null
            ? []
            : [TruncateActivityText(activity) with { ApplicationId = _applicationId }];

        return JsonSerializer.Serialize(
            new
            {
                op = 3,
                d = new
                {
                    since = idleSince,
                    activities,
                    status = "idle",
                    afk = true,
                },
            },
            SerializerOptions
        );
    }

    private static DiscordActivity TruncateActivityText(DiscordActivity activity) =>
        activity with
        {
            Name = TruncateText(activity.Name),
            Details = activity.Details is null ? null : TruncateText(activity.Details),
            State = activity.State is null ? null : TruncateText(activity.State),
            Assets = activity.Assets is null
                ? null
                : activity.Assets with
                {
                    LargeText = activity.Assets.LargeText is null
                        ? null
                        : TruncateText(activity.Assets.LargeText),
                    SmallText = activity.Assets.SmallText is null
                        ? null
                        : TruncateText(activity.Assets.SmallText),
                },
        };

    private static string TruncateText(string value) =>
        value.Length <= ActivityTextLimit ? value : $"{value[..(ActivityTextLimit - 3)]}...";

    public async ValueTask DisposeAsync()
    {
        _presenceUpdates.Writer.TryComplete();
        await _shutdown.CancelAsync();
        _webSocket?.Abort();

        await _workerTask;
        if (_connectionTask is not null)
        {
            await _connectionTask;
        }

        _sendLock.Dispose();
        _shutdown.Dispose();
    }

    private enum GatewayAction
    {
        Continue,
        Stop,
    }

    private sealed class ConnectionState
    {
        public long Sequence { get; set; } = -1;
        public bool HeartbeatAcknowledged { get; set; } = true;
    }

    private sealed record PresenceUpdate(DiscordActivity? Activity);

    private sealed record GatewayReceiveResult(
        string? Message,
        int? CloseCode,
        string? CloseDescription
    );

    private sealed record GatewayResponse(string? Url);
}
