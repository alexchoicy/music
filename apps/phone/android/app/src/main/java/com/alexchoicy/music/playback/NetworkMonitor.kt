package com.alexchoicy.music.playback

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Handler
import android.os.Looper
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.alexchoicy.music.api.isGatewayError
import com.alexchoicy.music.api.serverHttpUrl
import com.alexchoicy.music.session.SessionStore
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.min
import kotlin.time.Duration.Companion.milliseconds

private const val PROBE_MIN_MS = 2_000L
private const val PROBE_MAX_MS = 30_000L

class NetworkMonitor(
    context: Context,
    private val session: SessionStore,
    private val http: HttpClient,
    private val scope: CoroutineScope,
) {
    private val connectivity = context.getSystemService(ConnectivityManager::class.java)

    private var connected by mutableStateOf(false)
    private var notMetered by mutableStateOf(false)

    private var serverDown by mutableStateOf(false)
    private var probe: Job? = null

    val online get() = connected && !serverDown

    val unmetered get() = online && notMetered

    init {
        update(connectivity.getNetworkCapabilities(connectivity.activeNetwork))
        connectivity.registerDefaultNetworkCallback(
            object : ConnectivityManager.NetworkCallback() {
                override fun onCapabilitiesChanged(
                    network: Network,
                    capabilities: NetworkCapabilities,
                ) = update(capabilities)

                override fun onLost(network: Network) = update(null)
            },
            Handler(Looper.getMainLooper()),
        )
    }

    fun serverResponded() {
        serverDown = false
    }

    fun serverFailed() {
        if (!connected || serverDown) return
        serverDown = true
        scope.launch { watchServer() }
    }

    private fun update(capabilities: NetworkCapabilities?) {
        val wasConnected = connected
        connected = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        notMetered = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED) == true
        if (connected && !wasConnected && serverDown) watchServer()
    }

    private fun watchServer() {
        probe?.cancel()
        probe =
            scope.launch {
                var wait = PROBE_MIN_MS
                while (serverDown) {
                    delay(wait.milliseconds)
                    wait = min(wait * 2, PROBE_MAX_MS)
                    if (!connected || !serverDown) continue
                    val serverUrl = session.serverUrl
                    if (serverUrl == null || reaches(serverUrl)) serverDown = false
                }
            }
    }

    private suspend fun reaches(serverUrl: String): Boolean =
        try {
            !isGatewayError(http.get("${serverHttpUrl(serverUrl)}/auth").status.value)
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            false
        }
}
