package com.alexchoicy.music.data.search

import com.alexchoicy.music.api.SearchAlbum
import com.alexchoicy.music.api.SearchApi
import com.alexchoicy.music.api.SearchResults
import com.alexchoicy.music.api.valueOrNull
import com.alexchoicy.music.data.library.AlbumQuery
import com.alexchoicy.music.data.library.LibraryDao
import com.alexchoicy.music.data.library.PartyQuery
import com.alexchoicy.music.data.library.searchKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flowOf

// Online results come straight from the server and are not saved; offline, the library
// already saved on the device is searched instead.
class SearchRepository(
    private val api: SearchApi,
    private val dao: LibraryDao,
) {
    suspend fun search(query: String): SearchResults? = api.search(query).valueOrNull()

    fun searchSaved(query: String): Flow<SearchResults> =
        if (searchKey(query).isEmpty()) {
            flowOf(SearchResults(emptyList(), emptyList()))
        } else {
            combine(
                dao.observeAlbums(AlbumQuery(search = query)),
                dao.observeParties(PartyQuery(search = query)),
            ) { albums, parties ->
                SearchResults(albums.map { SearchAlbum(it, emptyList()) }, parties)
            }
        }
}
