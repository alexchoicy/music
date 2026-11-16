package com.alexchoicy.music.playback

import androidx.compose.runtime.snapshotFlow
import androidx.room3.Dao
import androidx.room3.Entity
import androidx.room3.Insert
import androidx.room3.PrimaryKey
import androidx.room3.Query
import com.alexchoicy.music.api.PlaybackApi
import com.alexchoicy.music.api.PlaybackTrack
import com.alexchoicy.music.api.isOutage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch
import kotlin.time.Duration.Companion.milliseconds

@Entity(tableName = "pending_listen")
data class PendingListenEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val albumId: Long,
    val trackId: Long,
)

@Dao
interface PendingListenDao {
    @Insert
    suspend fun add(listen: PendingListenEntity)

    @Query("SELECT * FROM pending_listen ORDER BY id LIMIT 1")
    suspend fun next(): PendingListenEntity?

    @Query("DELETE FROM pending_listen WHERE id = :id")
    suspend fun remove(id: Long)
}

private const val RETRY_MS = 60_000L

class PendingListens(
    private val dao: PendingListenDao,
    private val api: PlaybackApi,
    private val network: NetworkMonitor,
    private val scope: CoroutineScope,
) {
    private val wake = Channel<Unit>(Channel.CONFLATED)

    init {
        scope.launch { snapshotFlow { network.online }.filter { it }.collect { wake.trySend(Unit) } }
        scope.launch {
            for (signal in wake) {
                while (network.online && !send()) delay(RETRY_MS.milliseconds)
            }
        }
    }

    fun record(track: PlaybackTrack) {
        scope.launch {
            dao.add(PendingListenEntity(albumId = track.albumId, trackId = track.trackId))
            wake.trySend(Unit)
        }
    }

    private suspend fun send(): Boolean {
        while (true) {
            val listen = dao.next() ?: return true
            try {
                api.recordListen(listen.albumId, listen.trackId)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (e.isOutage()) return false
            }
            dao.remove(listen.id)
        }
    }
}
