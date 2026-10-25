package com.alexchoicy.music.ui.home

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.alexchoicy.music.api.ContinueListeningItem
import com.alexchoicy.music.api.HomeFeed
import com.alexchoicy.music.data.home.HomeRepository
import com.alexchoicy.music.data.home.RefreshResult
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class HomeViewModel(
    private val repository: HomeRepository,
) : ViewModel() {
    var feed by mutableStateOf<HomeFeed?>(null)
        private set
    var continueListening by mutableStateOf<List<ContinueListeningItem>>(emptyList())
        private set
    var loading by mutableStateOf(false)
        private set
    private var syncFailed by mutableStateOf(false)
    private var cacheRead by mutableStateOf(false)
    val failed get() = syncFailed && cacheRead

    private var request: Job? = null

    init {
        viewModelScope.launch {
            repository.home.collect { home ->
                feed = home?.feed
                continueListening = home?.continueListening.orEmpty()
                cacheRead = true
            }
        }
        viewModelScope.launch {
            repository.sessionChanges.collect {
                request?.cancel()
                loading = false
                syncFailed = false
                refresh()
            }
        }
    }

    fun refresh() {
        if (loading) return
        loading = true
        syncFailed = false
        request =
            viewModelScope.launch {
                syncFailed = repository.refresh() == RefreshResult.Failed
                loading = false
            }
    }
}
