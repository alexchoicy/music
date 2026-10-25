package com.alexchoicy.music.playback

import androidx.room3.Embedded
import androidx.room3.Entity
import androidx.room3.ForeignKey
import androidx.room3.PrimaryKey
import androidx.room3.Relation
import com.alexchoicy.music.api.TrackArtist
import com.alexchoicy.music.data.StoredTrack
import com.alexchoicy.music.data.toPlaybackTrack
import com.alexchoicy.music.data.toStored

@Entity(tableName = "queue_entry")
data class QueueEntryEntity(
    @PrimaryKey val entryId: String,
    val position: Int,
    val trackId: Long,
    val albumId: Long,
    val radio: Boolean,
    @Embedded val track: StoredTrack,
)

@Entity(
    tableName = "queue_entry_artist",
    primaryKeys = ["entryId", "position"],
    foreignKeys = [
        ForeignKey(
            entity = QueueEntryEntity::class,
            parentColumns = ["entryId"],
            childColumns = ["entryId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
)
data class QueueEntryArtistEntity(
    val entryId: String,
    val position: Int,
    val partyId: Long,
    val name: String,
)

@Entity(tableName = "queue_play_order")
data class QueuePlayOrderEntity(
    @PrimaryKey val position: Int,
    val entryId: String,
)

@Entity(tableName = "queue_state")
data class QueueStateEntity(
    @PrimaryKey val id: Int = 0,
    val currentEntryId: String?,
    val repeatMode: RepeatMode,
    val shuffle: Boolean,
)

data class StoredQueueEntry(
    @Embedded val entry: QueueEntryEntity,
    @Relation(parentColumns = ["entryId"], entityColumns = ["entryId"])
    val artists: List<QueueEntryArtistEntity>,
)

fun QueueEntry.toEntity(position: Int) =
    QueueEntryEntity(
        entryId = entryId,
        position = position,
        trackId = track.trackId,
        albumId = track.albumId,
        radio = radio,
        track = track.toStored(),
    )

fun QueueEntry.toArtistEntities() =
    track.artists.mapIndexed { index, artist -> QueueEntryArtistEntity(entryId, index, artist.partyId, artist.name) }

fun StoredQueueEntry.toQueueEntry() =
    QueueEntry(
        entryId = entry.entryId,
        track =
            entry.track.toPlaybackTrack(
                trackId = entry.trackId,
                albumId = entry.albumId,
                artists = artists.sortedBy { it.position }.map { TrackArtist(it.partyId, it.name) },
            ),
        radio = entry.radio,
    )
