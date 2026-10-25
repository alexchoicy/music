package com.alexchoicy.music.ui.detail

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch

class DetailViewModel<T : Any>(
    observe: Flow<T?>,
    private val sync: suspend () -> Boolean,
) : ViewModel() {
    var item by mutableStateOf<T?>(null)
        private set
    var syncing by mutableStateOf(false)
        private set
    private var syncFailed by mutableStateOf(false)
    private var cacheRead by mutableStateOf(false)
    val failed get() = syncFailed && cacheRead
    var refreshing by mutableStateOf(false)
        private set

    init {
        viewModelScope.launch {
            observe.collect {
                item = it
                cacheRead = true
            }
        }
        startSync()
    }

    fun refresh() {
        refreshing = true
        if (!syncing) startSync()
    }

    private fun startSync() {
        syncing = true
        syncFailed = false
        viewModelScope.launch {
            syncFailed = !sync()
            syncing = false
            refreshing = false
        }
    }
}
