package com.alexchoicy.music.ui.collection

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import com.alexchoicy.music.playback.NetworkMonitor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlin.time.Duration.Companion.milliseconds

private const val SEARCH_DEBOUNCE_MS = 300L
private const val OFFLINE_GRACE_MS = 2_000L

// Switches a downloaded filter on while offline and back off once online, unless the user
// changed it in between. The grace period ignores brief drops while switching networks.
suspend fun downloadedWhileOffline(
    network: NetworkMonitor,
    downloaded: () -> Boolean,
    setDownloaded: (Boolean) -> Unit,
) {
    var first = true
    var auto = false
    snapshotFlow { network.online }.collectLatest { online ->
        if (!online) {
            if (!first) delay(OFFLINE_GRACE_MS.milliseconds)
            if (!downloaded()) {
                setDownloaded(true)
                auto = true
            }
        } else if (auto) {
            auto = false
            if (downloaded()) setDownloaded(false)
        }
        first = false
    }
}

class CollectionLoader<Q, T>(
    private val scope: CoroutineScope,
    initial: Q,
    search: (Q) -> String,
    observe: (Q) -> Flow<List<T>?>,
    syncTriggers: Flow<Any?>,
    private val sync: suspend () -> Boolean,
) {
    var query by mutableStateOf(initial)
    var items by mutableStateOf<List<T>?>(null)
        private set
    var syncing by mutableStateOf(false)
        private set
    private var syncFailed by mutableStateOf(false)
    private var cacheRead by mutableStateOf(false)
    val failed get() = syncFailed && cacheRead
    var refreshing by mutableStateOf(false)
        private set

    private var syncRequest: Job? = null

    init {
        scope.launch {
            var previous: Q? = null
            snapshotFlow { query }.collectLatest { current ->
                val last = previous
                if (last != null && search(last) != search(current)) delay(SEARCH_DEBOUNCE_MS.milliseconds)
                previous = current
                observe(current).collect {
                    items = it
                    cacheRead = true
                }
            }
        }
        scope.launch {
            syncTriggers.collect {
                syncRequest?.cancel()
                startSync()
            }
        }
    }

    fun downloadedWhileOffline(
        network: NetworkMonitor,
        downloaded: (Q) -> Boolean,
        withDownloaded: (Q, Boolean) -> Q,
    ) {
        scope.launch {
            downloadedWhileOffline(network, { downloaded(query) }) {
                query = withDownloaded(query, it)
            }
        }
    }

    fun refresh() {
        refreshing = true
        if (syncRequest?.isActive != true) startSync()
    }

    private fun startSync() {
        syncing = true
        syncFailed = false
        syncRequest =
            scope.launch {
                syncFailed = !sync()
                syncing = false
                refreshing = false
            }
    }
}
