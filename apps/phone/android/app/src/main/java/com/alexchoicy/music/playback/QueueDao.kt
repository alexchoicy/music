package com.alexchoicy.music.playback

import androidx.room3.Dao
import androidx.room3.Insert
import androidx.room3.Query
import androidx.room3.Transaction
import androidx.room3.Upsert

@Dao
abstract class QueueDao {
    @Transaction
    open suspend fun load(): SavedQueue {
        val state = state() ?: return SavedQueue()
        return SavedQueue(
            entries = entries().map { it.toQueueEntry() },
            currentEntryId = state.currentEntryId,
            repeatMode = state.repeatMode,
            shuffle = state.shuffle,
            playOrder = playOrder(),
        )
    }

    @Transaction
    open suspend fun save(queue: SavedQueue) {
        deleteEntries()
        deletePlayOrder()
        insertEntries(queue.entries.mapIndexed { position, entry -> entry.toEntity(position) })
        insertArtists(queue.entries.flatMap { it.toArtistEntities() })
        insertPlayOrder(queue.playOrder.mapIndexed { position, entryId -> QueuePlayOrderEntity(position, entryId) })
        upsertState(QueueStateEntity(currentEntryId = queue.currentEntryId, repeatMode = queue.repeatMode, shuffle = queue.shuffle))
    }

    @Query("SELECT * FROM queue_state WHERE id = 0")
    protected abstract suspend fun state(): QueueStateEntity?

    @Transaction
    @Query("SELECT * FROM queue_entry ORDER BY position")
    protected abstract suspend fun entries(): List<StoredQueueEntry>

    @Query("SELECT entryId FROM queue_play_order ORDER BY position")
    protected abstract suspend fun playOrder(): List<String>

    @Query("DELETE FROM queue_entry")
    protected abstract suspend fun deleteEntries()

    @Query("DELETE FROM queue_play_order")
    protected abstract suspend fun deletePlayOrder()

    @Insert
    protected abstract suspend fun insertEntries(entries: List<QueueEntryEntity>)

    @Insert
    protected abstract suspend fun insertArtists(artists: List<QueueEntryArtistEntity>)

    @Insert
    protected abstract suspend fun insertPlayOrder(order: List<QueuePlayOrderEntity>)

    @Upsert
    protected abstract suspend fun upsertState(state: QueueStateEntity)
}
