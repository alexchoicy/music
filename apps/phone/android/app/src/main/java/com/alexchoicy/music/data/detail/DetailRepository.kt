package com.alexchoicy.music.data.detail

import com.alexchoicy.music.api.AlbumDetail
import com.alexchoicy.music.api.ApiOutcome
import com.alexchoicy.music.api.DetailApi
import com.alexchoicy.music.api.PartyDetail
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged

class DetailRepository(private val api: DetailApi, private val dao: DetailDao) {
    fun album(id: Long): Flow<AlbumDetail?> = dao.observeAlbum(id).distinctUntilChanged()

    fun party(id: Long): Flow<PartyDetail?> = dao.observeParty(id).distinctUntilChanged()

    suspend fun syncAlbum(id: Long): Boolean = sync({ api.fetchAlbum(id) }, dao::replaceAlbum)

    suspend fun syncParty(id: Long): Boolean = sync({ api.fetchParty(id) }, dao::replaceParty)

    private suspend fun <T> sync(
        request: suspend () -> ApiOutcome<T>,
        save: suspend (T) -> Unit,
    ): Boolean {
        val value = (request() as? ApiOutcome.Loaded)?.value ?: return false
        return try {
            save(value)
            true
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            false
        }
    }
}
