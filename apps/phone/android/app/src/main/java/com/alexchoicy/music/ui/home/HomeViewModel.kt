package com.alexchoicy.music.ui.home

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.alexchoicy.music.api.HomeFeed
import com.alexchoicy.music.data.home.HomeRepository
import com.alexchoicy.music.data.home.RefreshResult
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class HomeViewModel(private val repository: HomeRepository) : ViewModel() {
    var feed by mutableStateOf<HomeFeed?>(null)
        private set
    var loading by mutableStateOf(false)
        private set
    var failed by mutableStateOf(false)
        private set

    private var request: Job? = null

    init {
        viewModelScope.launch {
            repository.home.collect { home ->
                feed =
                    home?.let {
                        if (it.connected) it.feed else it.feed.copy(continueListening = emptyList())
                    }
            }
        }
        viewModelScope.launch {
            repository.sessionChanges.collect {
                request?.cancel()
                loading = false
                failed = false
                refresh()
            }
        }
    }

    fun refresh() {
        if (loading) return
        loading = true
        failed = false
        request = viewModelScope.launch {
            failed = repository.refresh() == RefreshResult.Failed
            loading = false
        }
    }
}
