package com.alexchoicy.music.ui.collection

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

private const val SEARCH_DEBOUNCE_MS = 300L

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
    var failed by mutableStateOf(false)
        private set
    var refreshing by mutableStateOf(false)
        private set

    private var syncRequest: Job? = null

    init {
        scope.launch {
            var previous: Q? = null
            snapshotFlow { query }.collectLatest { current ->
                val last = previous
                if (last != null && search(last) != search(current)) delay(SEARCH_DEBOUNCE_MS)
                previous = current
                observe(current).collect { items = it }
            }
        }
        scope.launch {
            syncTriggers.collect {
                syncRequest?.cancel()
                startSync()
            }
        }
    }

    fun refresh() {
        refreshing = true
        if (syncRequest?.isActive != true) startSync()
    }

    private fun startSync() {
        syncing = true
        failed = false
        syncRequest = scope.launch {
            failed = !sync()
            syncing = false
            refreshing = false
        }
    }
}
