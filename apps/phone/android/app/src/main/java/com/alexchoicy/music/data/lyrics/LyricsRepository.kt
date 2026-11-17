package com.alexchoicy.music.data.lyrics

import com.alexchoicy.music.api.ApiOutcome
import com.alexchoicy.music.api.LyricVersion
import com.alexchoicy.music.api.Lyrics
import com.alexchoicy.music.api.LyricsApi
import com.alexchoicy.music.api.valueOrNull
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged

class LyricsRepository(
    private val api: LyricsApi,
    private val dao: LyricsDao,
) {
    fun versions(trackId: Long): Flow<List<LyricVersion>?> = dao.observeVersions(trackId).distinctUntilChanged()

    fun lyrics(subtitleId: Long): Flow<Lyrics?> = dao.observeLyrics(subtitleId).distinctUntilChanged()

    suspend fun syncVersions(
        albumId: Long,
        trackId: Long,
    ): Boolean = sync({ api.versions(albumId, trackId) }) { dao.replaceVersions(trackId, it) }

    suspend fun syncLyrics(subtitleId: Long): Boolean = sync({ api.lyrics(subtitleId) }) { dao.upsertLyrics(it.toEntity()) }

    private suspend fun <T> sync(
        request: suspend () -> ApiOutcome<T>,
        save: suspend (T) -> Unit,
    ): Boolean {
        val value = request().valueOrNull() ?: return false
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
