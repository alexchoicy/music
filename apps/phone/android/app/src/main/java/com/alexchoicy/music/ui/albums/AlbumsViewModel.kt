package com.alexchoicy.music.ui.albums

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.alexchoicy.music.api.Language
import com.alexchoicy.music.data.library.AlbumQuery
import com.alexchoicy.music.data.library.LibraryRepository
import com.alexchoicy.music.playback.NetworkMonitor
import com.alexchoicy.music.ui.collection.CollectionLoader
import kotlinx.coroutines.launch

class AlbumsViewModel(
    repository: LibraryRepository,
    network: NetworkMonitor,
) : ViewModel() {
    val albums =
        CollectionLoader(
            scope = viewModelScope,
            initial = AlbumQuery(),
            search = { it.search.trim() },
            observe = repository::albums,
            syncTriggers = repository.sessionChanges,
            sync = repository::syncAlbums,
        )

    var languages by mutableStateOf(emptyList<Language>())
        private set

    init {
        viewModelScope.launch { repository.languages.collect { languages = it } }
        albums.downloadedWhileOffline(network, { it.downloaded }, { query, on -> query.copy(downloaded = on) })
    }
}
