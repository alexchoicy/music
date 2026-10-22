package com.alexchoicy.music.data.library

import androidx.compose.runtime.snapshotFlow
import com.alexchoicy.music.api.AlbumSummary
import com.alexchoicy.music.api.AlbumType
import com.alexchoicy.music.api.ApiOutcome
import com.alexchoicy.music.api.Language
import com.alexchoicy.music.api.LibraryApi
import com.alexchoicy.music.api.ListSort
import com.alexchoicy.music.api.PartySummary
import com.alexchoicy.music.api.PartyType
import com.alexchoicy.music.session.SessionStore
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged

data class AlbumQuery(
    val search: String = "",
    val sort: ListSort = ListSort.TitleAsc,
    val types: Set<AlbumType> = emptySet(),
    val languageIds: Set<Long> = emptySet(),
)

data class PartyQuery(
    val search: String = "",
    val sort: ListSort = ListSort.TitleAsc,
    val type: PartyType? = null,
)

class LibraryRepository(
    private val session: SessionStore,
    private val api: LibraryApi,
    private val dao: LibraryDao,
) {
    val sessionChanges: Flow<Any?> =
        snapshotFlow { session.serverUrl to session.token }.distinctUntilChanged()

    val languages: Flow<List<Language>> = dao.observeLanguages()

    fun albums(query: AlbumQuery): Flow<List<AlbumSummary>?> =
        whenSynced(LibraryKind.Albums, dao.observeAlbums(query))

    fun parties(query: PartyQuery): Flow<List<PartySummary>?> =
        whenSynced(LibraryKind.Parties, dao.observeParties(query))

    suspend fun syncAlbums(): Boolean = coroutineScope {
        val languages = async { call(api::fetchLanguages) }
        val albums = call(api::fetchAlbums) ?: return@coroutineScope false
        save { dao.replaceAlbums(albums, languages.await()) }
    }

    suspend fun syncParties(): Boolean {
        val parties = call(api::fetchParties) ?: return false
        return save { dao.replaceParties(parties) }
    }

    private fun <T> whenSynced(kind: LibraryKind, items: Flow<List<T>>): Flow<List<T>?> =
        combine(dao.observeSynced(kind), items) { synced, list -> if (synced) list else null }

    private suspend fun save(block: suspend () -> Unit): Boolean = try {
        block()
        true
    } catch (e: CancellationException) {
        throw e
    } catch (_: Exception) {
        false
    }

    private suspend fun <T> call(request: suspend () -> ApiOutcome<T>): T? =
        (request() as? ApiOutcome.Loaded)?.value
}
