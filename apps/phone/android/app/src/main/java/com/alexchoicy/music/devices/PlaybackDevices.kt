package com.alexchoicy.music.devices

import android.content.Context
import android.os.Build
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.core.content.edit
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ProcessLifecycleOwner
import com.alexchoicy.music.Notices
import com.alexchoicy.music.api.ApiJson
import com.alexchoicy.music.api.serverWebSocketUrl
import com.alexchoicy.music.playback.MusicPlayer
import com.alexchoicy.music.playback.NetworkMonitor
import com.alexchoicy.music.playback.PlayerStatus
import com.alexchoicy.music.playback.toJson
import com.alexchoicy.music.playback.toTransferSnapshot
import com.alexchoicy.music.session.SessionStore
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.websocket.DefaultClientWebSocketSession
import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.client.plugins.websocket.webSocket
import io.ktor.client.request.bearerAuth
import io.ktor.websocket.Frame
import io.ktor.websocket.readText
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.merge
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import java.util.UUID
import java.util.concurrent.TimeUnit
import kotlin.math.min
import kotlin.time.Duration.Companion.milliseconds

const val MAX_DEVICE_NAME_LENGTH = 64
private const val TRANSFER_TIMEOUT_MS = 30_000L
private const val MAX_RECONNECT_DELAY_MS = 5 * 60 * 1000L
private const val PING_INTERVAL_S = 30L

@Serializable
data class PlaybackTrackState(
    val trackId: String,
    val albumId: String,
    val title: String,
    val albumTitle: String,
    val artists: List<String>,
    val coverUrl: String? = null,
    val durationMs: Long,
)

@Serializable
data class PlaybackState(
    val status: String,
    val positionMs: Long,
    val track: PlaybackTrackState? = null,
)

@Serializable
data class DeviceSession(
    val sessionId: String,
    val state: PlaybackState? = null,
    val stateUpdatedAt: Long,
    val activatedAt: Long,
    val connectedAt: Long,
)

@Serializable
data class PlaybackDevice(
    val deviceId: String,
    val name: String,
    val sessions: List<DeviceSession>,
)

data class OtherDevice(
    val deviceId: String,
    val sessionId: String,
    val name: String,
    val state: PlaybackState?,
)

data class PendingTransfer(
    val requestId: String,
    val deviceId: String,
    val sessionId: String,
    // True once the queue arrived and this phone is loading it.
    val preparing: Boolean,
)

class PlaybackDevices(
    context: Context,
    private val session: SessionStore,
    private val player: MusicPlayer,
    private val network: NetworkMonitor,
    private val notices: Notices,
    private val scope: CoroutineScope,
) {
    private val preferences = context.getSharedPreferences("playbackDevice", Context.MODE_PRIVATE)
    private val client =
        HttpClient(OkHttp) {
            engine {
                config {
                    readTimeout(0, TimeUnit.MILLISECONDS)
                    pingInterval(PING_INTERVAL_S, TimeUnit.SECONDS)
                }
            }
            install(WebSockets)
        }

    // Identifies this phone to the user's other players; unrelated to sign-in.
    val deviceId: String =
        preferences.getString(DEVICE_ID_KEY, null)
            ?: UUID
                .randomUUID()
                .toString()
                .also { id -> preferences.edit { putString(DEVICE_ID_KEY, id) } }
    val defaultName: String = Build.MODEL.ifBlank { "Android" }

    var deviceName by mutableStateOf(preferences.getString(DEVICE_NAME_KEY, null))
        private set
    var connected by mutableStateOf(false)
        private set
    var devices by mutableStateOf<List<PlaybackDevice>>(emptyList())
        private set
    var discordDeviceId by mutableStateOf<String?>(null)
        private set
    var transfer by mutableStateOf<PendingTransfer?>(null)
        private set

    val displayName get() = deviceName ?: defaultName

    // Other devices by their active session; this phone's other sessions are earlier
    // connections the server has not dropped yet.
    val otherDevices: List<OtherDevice>
        get() =
            devices.filter { it.deviceId != deviceId }.mapNotNull { device ->
                activeSession(device.sessions)?.let {
                    OtherDevice(
                        device.deviceId,
                        it.sessionId,
                        device.name,
                        it.state,
                    )
                }
            }

    private var socket: DefaultClientWebSocketSession? = null

    // A new session per connection: after a network change the server may still hold
    // the previous one, and it ignores a session ID it already has.
    private var sessionId = UUID.randomUUID().toString()
    private var transferTimeout: Job? = null

    // Requests this phone answered as the source, keyed to the destination's name.
    private val outgoingTransfers = mutableMapOf<String, String>()
    private val foreground = MutableStateFlow(false)
    private var started = false

    fun start() {
        if (started) return
        started = true
        val lifecycle = ProcessLifecycleOwner.get().lifecycle
        scope.launch {
            lifecycle.currentStateFlow.collect {
                foreground.value = it.isAtLeast(Lifecycle.State.STARTED)
            }
        }
        scope.launch {
            // Paused in the background, the phone needs no live updates.
            combine(
                snapshotFlow { session.serverUrl to session.token },
                snapshotFlow { network.online },
                snapshotFlow { player.status == PlayerStatus.Playing || player.loading },
                foreground,
            ) { (serverUrl, token), online, playing, foreground ->
                if (serverUrl != null && token != null && online && (foreground || playing)) {
                    serverUrl to token
                } else {
                    null
                }
            }.distinctUntilChanged()
                .collectLatest { credentials -> credentials?.let { connect(it.first, it.second) } }
        }
        scope.launch {
            merge(
                snapshotFlow {
                    Triple(
                        player.status,
                        player.loading,
                        player.current?.entryId,
                    )
                }.map {},
                player.seeks,
            ).collect { reportState() }
        }
    }

    fun rename(name: String) {
        val normalized =
            name
                .trim()
                .take(MAX_DEVICE_NAME_LENGTH)
                .trim()
                .ifEmpty { null }
        preferences.edit { putString(DEVICE_NAME_KEY, normalized) }
        deviceName = normalized
        register()
    }

    fun control(
        device: OtherDevice,
        play: Boolean,
    ) {
        send(
            "control",
            buildJsonObject {
                put("deviceId", device.deviceId)
                put("sessionId", device.sessionId)
                put("action", if (play) "play" else "pause")
            },
        )
    }

    fun selectDiscordDevice(deviceId: String?) {
        send("discordDevice", buildJsonObject { put("deviceId", deviceId) })
    }

    // Asks another device for its queue; it keeps playing until this phone is ready.
    fun moveHere(device: OtherDevice) {
        if (transfer != null) return
        val requestId = UUID.randomUUID().toString()
        val sent =
            send(
                "transfer",
                buildJsonObject {
                    put("requestId", requestId)
                    put("deviceId", device.deviceId)
                    put("sessionId", device.sessionId)
                },
            )
        if (!sent) {
            notices.show("Couldn't move playback. The live connection isn't available.")
            return
        }
        transfer = PendingTransfer(requestId, device.deviceId, device.sessionId, preparing = false)
        transferTimeout?.cancel()
        transferTimeout =
            scope.launch {
                delay(TRANSFER_TIMEOUT_MS.milliseconds)
                sendTransferResult(requestId, success = false)
                failTransfer(requestId, "The other device didn't respond.")
            }
    }

    private suspend fun connect(
        serverUrl: String,
        token: String,
    ) {
        var attempt = 0
        while (currentCoroutineContext().isActive) {
            try {
                client.webSocket(
                    urlString = "${serverWebSocketUrl(serverUrl)}/ws",
                    request = { bearerAuth(token) },
                ) {
                    socket = this
                    sessionId = UUID.randomUUID().toString()
                    attempt = 0
                    connected = true
                    register()
                    reportState()
                    for (frame in incoming) {
                        if (frame is Frame.Text) handle(frame.readText())
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
            } finally {
                closed()
            }
            delay(min(1000L shl attempt, MAX_RECONNECT_DELAY_MS).milliseconds)
            attempt = min(attempt + 1, 9)
        }
    }

    private fun closed() {
        socket = null
        connected = false
        devices = emptyList()
        outgoingTransfers.clear()
        transfer
            ?.takeIf { !it.preparing }
            ?.let { failTransfer(it.requestId, "The live connection was lost.") }
    }

    private fun register() {
        send(
            "register",
            buildJsonObject {
                put("deviceId", deviceId)
                put("sessionId", sessionId)
                put("name", displayName)
            },
        )
    }

    private fun reportState() {
        val entry = player.current
        val status =
            when {
                entry == null -> "idle"
                player.loading -> "loading"
                player.status == PlayerStatus.Playing -> "playing"
                player.status == PlayerStatus.Paused -> "paused"
                else -> "idle"
            }
        val state =
            PlaybackState(
                status = status,
                positionMs = player.positionMs.coerceAtLeast(0),
                track =
                    entry?.track?.let { track ->
                        PlaybackTrackState(
                            trackId = track.trackId.toString(),
                            albumId = track.albumId.toString(),
                            title = track.title,
                            albumTitle = track.albumTitle,
                            artists = track.artists.map { it.name },
                            coverUrl = track.coverUrl,
                            durationMs = track.durationMs.coerceAtLeast(0),
                        )
                    },
            )
        send("state", ApiJson.encodeToJsonElement(PlaybackState.serializer(), state))
    }

    private fun handle(text: String) {
        val message =
            runCatching { ApiJson.parseToJsonElement(text).jsonObject }.getOrNull() ?: return
        val data = message["data"] as? JsonObject ?: return

        fun string(key: String) = (data[key] as? JsonPrimitive)?.contentOrNull
        when ((message["type"] as? JsonPrimitive)?.contentOrNull) {
            "devices" -> {
                devices = data["devices"]?.let {
                    runCatching {
                        ApiJson.decodeFromJsonElement(
                            ListSerializer(PlaybackDevice.serializer()),
                            it,
                        )
                    }.getOrNull()
                } ?: return
                discordDeviceId = string("discordDeviceId")
            }

            "control" -> {
                // Toggling while loading does nothing, so a loading track is left to start.
                val pause = string("action") == "pause"
                if (pause == (player.status == PlayerStatus.Playing)) player.togglePlayback()
            }

            "transferSnapshotRequest" -> {
                val requestId = string("requestId") ?: return
                val snapshot = player.transferSnapshot()
                if (snapshot != null) outgoingTransfers[requestId] = string("deviceName").orEmpty()
                send(
                    "transferSnapshot",
                    buildJsonObject {
                        put("requestId", requestId)
                        put("snapshot", snapshot?.toJson() ?: JsonNull)
                    },
                )
            }

            "transferSnapshot" -> receiveTransfer(string("requestId") ?: return, data["snapshot"])
            "transferRelease" -> {
                val name = outgoingTransfers.remove(string("requestId") ?: return) ?: return
                player.stopForTransfer()
                notices.show(if (name.isEmpty()) "Now playing on another device." else "Now playing on $name.")
            }

            "transferFailed" -> {
                // Once preparing, this phone holds the queue and reports its own outcome.
                if (transfer?.preparing == true) return
                failTransfer(
                    string("requestId") ?: return,
                    string("reason") ?: "The other device couldn't respond.",
                )
            }
        }
    }

    private fun receiveTransfer(
        requestId: String,
        data: JsonElement?,
    ) {
        val pending = transfer
        if (pending?.requestId != requestId || pending.preparing) return
        val snapshot = (data as? JsonObject)?.toTransferSnapshot()
        if (snapshot == null) {
            sendTransferResult(requestId, success = false)
            failTransfer(requestId, "The other device sent a queue this phone can't play.")
            return
        }
        transferTimeout?.cancel()
        transfer = pending.copy(preparing = true)
        scope.launch {
            val success = player.adoptTransfer(snapshot)
            // The other device only stops after this confirmation.
            sendTransferResult(requestId, success)
            if (success) {
                finishTransfer(requestId)
            } else {
                failTransfer(
                    requestId,
                    "This phone couldn't start playback. The other device kept playing.",
                )
            }
        }
    }

    private fun sendTransferResult(
        requestId: String,
        success: Boolean,
    ) {
        send(
            "transferResult",
            buildJsonObject {
                put("requestId", requestId)
                put("success", success)
            },
        )
    }

    private fun finishTransfer(requestId: String) {
        if (transfer?.requestId != requestId) return
        transferTimeout?.cancel()
        transfer = null
    }

    private fun failTransfer(
        requestId: String,
        reason: String,
    ) {
        if (transfer?.requestId != requestId) return
        finishTransfer(requestId)
        notices.show("Couldn't move playback. $reason")
    }

    private fun send(
        type: String,
        data: JsonElement,
    ): Boolean {
        val socket = socket ?: return false
        val message =
            buildJsonObject {
                put("type", type)
                put("data", data)
            }
        return socket.outgoing.trySend(Frame.Text(message.toString())).isSuccess
    }

    private companion object {
        const val DEVICE_ID_KEY = "deviceId"
        const val DEVICE_NAME_KEY = "deviceName"
    }
}

// The session that represents a device: the latest to start playing, then the latest
// with a track.
private fun activeSession(sessions: List<DeviceSession>): DeviceSession? =
    sessions.filter { it.state?.status == "playing" }.maxByOrNull { it.activatedAt }
        ?: sessions.filter { it.state?.track != null }.maxByOrNull { it.stateUpdatedAt }
        ?: sessions.maxByOrNull { it.connectedAt }
