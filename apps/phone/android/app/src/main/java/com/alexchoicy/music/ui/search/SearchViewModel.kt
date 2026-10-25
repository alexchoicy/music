package com.alexchoicy.music.ui.search

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.alexchoicy.music.api.SearchResults
import com.alexchoicy.music.data.search.SearchRepository
import com.alexchoicy.music.playback.NetworkMonitor
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlin.time.Duration.Companion.milliseconds

private const val SEARCH_DEBOUNCE_MS = 300L

sealed interface SearchState {
    data object Idle : SearchState

    data object Loading : SearchState

    data object Failed : SearchState

    data class Loaded(
        val query: String,
        val results: SearchResults,
        val offline: Boolean,
    ) : SearchState
}

class SearchViewModel(
    private val repository: SearchRepository,
    private val network: NetworkMonitor,
) : ViewModel() {
    var search by mutableStateOf("")
    var state by mutableStateOf<SearchState>(SearchState.Idle)
        private set
    var retrying by mutableStateOf(false)
        private set
    private var attempt by mutableIntStateOf(0)

    init {
        viewModelScope.launch {
            var previous: String? = null
            snapshotFlow {
                Triple(
                    search.trim(),
                    network.online,
                    attempt,
                )
            }.collectLatest { (query, online) ->
                if (query.isEmpty()) {
                    previous = query
                    state = SearchState.Idle
                    return@collectLatest
                }
                if (query != previous) {
                    if (state !is SearchState.Loaded) state = SearchState.Loading
                    delay(SEARCH_DEBOUNCE_MS.milliseconds)
                    previous = query
                }
                if (online) {
                    val results = repository.search(query)
                    retrying = false
                    state =
                        if (results != null) {
                            SearchState.Loaded(
                                query,
                                results,
                                offline = false,
                            )
                        } else {
                            SearchState.Failed
                        }
                } else {
                    retrying = false
                    repository
                        .searchSaved(query)
                        .collect { state = SearchState.Loaded(query, it, offline = true) }
                }
            }
        }
    }

    fun retry() {
        retrying = true
        attempt++
    }
}
