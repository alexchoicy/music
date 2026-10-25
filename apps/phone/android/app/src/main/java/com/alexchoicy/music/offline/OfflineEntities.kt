package com.alexchoicy.music.offline

import androidx.room3.Embedded
import androidx.room3.Entity
import androidx.room3.ForeignKey
import androidx.room3.Index
import androidx.room3.PrimaryKey
import androidx.room3.Relation
import com.alexchoicy.music.data.StoredTrack

enum class DownloadStatus { Queued, Downloading, Downloaded, Failed }

// whole is a downloaded album; otherwise the album only holds tracks saved while playing
// or for downloaded playlists.
@Entity(tableName = "offline_album")
data class OfflineAlbumEntity(
    @PrimaryKey val albumId: Long,
    val whole: Boolean,
    val title: String,
    val artists: String?,
    val coverUrl: String?,
    val downloadedAt: Long,
)

@Entity(tableName = "offline_playlist")
data class OfflinePlaylistEntity(
    @PrimaryKey val playlistId: Long,
    val name: String,
    val coverUrl: String?,
    val downloadedAt: Long,
)

@Entity(
    tableName = "offline_playlist_track",
    primaryKeys = ["playlistId", "position"],
    indices = [Index("trackId")],
)
data class OfflinePlaylistTrackEntity(
    val playlistId: Long,
    val position: Int,
    val trackId: Long,
)

// Tracks can share a FileObject, so the file on disk is named after it and stored once.
@Entity(tableName = "track_download", indices = [Index("albumId")])
data class TrackDownloadEntity(
    @PrimaryKey val trackId: Long,
    val albumId: Long,
    val position: Int,
    @Embedded val track: StoredTrack,
    val fileId: String,
    val fileName: String,
    val sizeInBytes: Long,
    val status: DownloadStatus,
    val error: String?,
    val played: Boolean,
)

@Entity(
    tableName = "track_download_artist",
    primaryKeys = ["trackId", "position"],
    foreignKeys = [
        ForeignKey(
            entity = TrackDownloadEntity::class,
            parentColumns = ["trackId"],
            childColumns = ["trackId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
)
data class TrackDownloadArtistEntity(
    val trackId: Long,
    val position: Int,
    val partyId: Long,
    val name: String,
)

data class StoredDownload(
    @Embedded val download: TrackDownloadEntity,
    @Relation(parentColumns = ["trackId"], entityColumns = ["trackId"])
    val artists: List<TrackDownloadArtistEntity>,
)

@Entity(tableName = "offline_artwork")
data class OfflineArtworkEntity(
    @PrimaryKey val url: String,
    val fileName: String,
)
