package com.alexchoicy.music.ui.parties

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.alexchoicy.music.data.library.LibraryRepository
import com.alexchoicy.music.data.library.PartyQuery
import com.alexchoicy.music.ui.collection.CollectionLoader

class PartiesViewModel(repository: LibraryRepository) : ViewModel() {
    val parties = CollectionLoader(
        scope = viewModelScope,
        initial = PartyQuery(),
        search = { it.search.trim() },
        observe = repository::parties,
        syncTriggers = repository.sessionChanges,
        sync = repository::syncParties,
    )
}
