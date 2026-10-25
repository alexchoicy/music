package com.alexchoicy.music.data.playlists

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.alexchoicy.music.Notices
import com.alexchoicy.music.api.PlaybackTrack
import com.alexchoicy.music.api.PlaylistApi
import com.alexchoicy.music.api.PlaylistDetail
import com.alexchoicy.music.api.PlaylistEdit
import com.alexchoicy.music.api.PlaylistEntry
import com.alexchoicy.music.api.PlaylistSummary
import com.alexchoicy.music.api.valueOrNull
import com.alexchoicy.music.offline.Downloads
import com.alexchoicy.music.playback.NetworkMonitor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

data class PlaylistTrack(
    val albumDiscId: Long,
    val trackId: Long,
)

const val PLAYLIST_CONFLICT = "The playlist changed elsewhere. Try again."

// Playlists are kept for the session; downloaded ones also open without the server.
class PlaylistRepository(
    private val api: PlaylistApi,
    private val downloads: Downloads,
    private val network: NetworkMonitor,
    private val notices: Notices,
    private val scope: CoroutineScope,
) {
    var playlists by mutableStateOf<List<PlaylistSummary>?>(null)
        private set
    private var details by mutableStateOf<Map<Long, PlaylistDetail>>(emptyMap())

    val downloadedPlaylists: List<PlaylistSummary>
        get() =
            downloads.playlists.mapNotNull { downloads.savedPlaylist(it.playlistId) }.map { playlist ->
                PlaylistSummary(
                    id = playlist.id,
                    name = playlist.name,
                    version = null,
                    trackCount = playlist.entries.size,
                    totalDurationMs = playlist.totalDurationMs,
                    coverUrls = playlist.coverUrls,
                )
            }

    fun playlist(id: Long): PlaylistDetail? = details[id] ?: downloads.savedPlaylist(id)

    suspend fun syncList(): Boolean {
        playlists = api.fetchPlaylists().valueOrNull() ?: return false
        return true
    }

    suspend fun sync(id: Long): Boolean {
        val playlist = api.fetchPlaylist(id).valueOrNull() ?: return false
        details = details + (id to playlist)
        downloads.syncPlaylist(playlist)
        return true
    }

    // Online every entry with audio plays; offline only downloaded ones.
    fun playableTracks(playlist: PlaylistDetail): List<PlaybackTrack> =
        playlist.tracks.filter { network.online || downloads.isDownloaded(it.trackId) }

    suspend fun loadPlayableTracks(id: Long): List<PlaybackTrack>? {
        if (network.online) sync(id)
        return playlist(id)?.let(::playableTracks)
    }

    // Edits run outside the caller, so closing a sheet doesn't drop them halfway.
    // A track to add is added here too, so it isn't lost if the sheet closes while creating.
    suspend fun create(
        name: String,
        track: PlaylistTrack? = null,
    ): PlaylistDetail? =
        scope
            .async {
                val created = api.create(name).valueOrNull()
                if (created != null) details = details + (created.id to created)
                val version = created?.version
                if (created != null && version != null && track != null) {
                    addTrackNow(created.id, version, created.name, track)
                } else {
                    syncList()
                }
                created
            }.await()

    suspend fun rename(
        id: Long,
        version: Long,
        name: String,
    ): PlaylistEdit = scope.async { api.rename(id, version, name).also { refresh(id) } }.await()

    fun delete(
        id: Long,
        version: Long,
        name: String,
        onDeleted: () -> Unit = {},
    ) {
        scope.launch {
            when (api.delete(id, version)) {
                PlaylistEdit.Done -> {
                    details = details - id
                    downloads.remove(albumIds = emptyList(), playlistIds = listOf(id))
                    notices.show("Deleted $name")
                    onDeleted()
                }

                PlaylistEdit.Conflict -> notices.show(PLAYLIST_CONFLICT)
                PlaylistEdit.Failed -> notices.show("Couldn't delete the playlist.")
            }
            syncList()
        }
    }

    fun addTrack(
        id: Long,
        version: Long,
        name: String,
        track: PlaylistTrack,
    ) {
        scope.launch { addTrackNow(id, version, name, track) }
    }

    private suspend fun addTrackNow(
        id: Long,
        version: Long,
        name: String,
        track: PlaylistTrack,
    ) {
        notices.show(
            when (api.addTrack(id, version, track.albumDiscId, track.trackId)) {
                PlaylistEdit.Done -> "Added to $name"
                PlaylistEdit.Conflict -> PLAYLIST_CONFLICT
                PlaylistEdit.Failed -> "Couldn't add the track."
            },
        )
        refresh(id)
    }

    fun removeEntry(
        playlist: PlaylistDetail,
        entry: PlaylistEntry,
    ) {
        val version = playlist.version ?: return
        val entryId = entry.entryId ?: return
        scope.launch {
            when (api.removeEntry(playlist.id, version, entryId)) {
                PlaylistEdit.Done -> Unit
                PlaylistEdit.Conflict -> notices.show(PLAYLIST_CONFLICT)
                PlaylistEdit.Failed -> notices.show("Couldn't remove the track.")
            }
            refresh(playlist.id)
        }
    }

    // Downloaded playlists are refreshed too, so their downloads follow the change.
    private suspend fun refresh(id: Long) =
        coroutineScope {
            launch { syncList() }
            if (id in details || downloads.playlists.any { it.playlistId == id }) launch { sync(id) }
        }
}
