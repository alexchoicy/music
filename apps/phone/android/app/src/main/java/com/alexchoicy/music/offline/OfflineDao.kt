package com.alexchoicy.music.offline

import androidx.room3.Dao
import androidx.room3.Insert
import androidx.room3.OnConflictStrategy
import androidx.room3.Query
import androidx.room3.Transaction
import androidx.room3.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
abstract class OfflineDao {
    @Transaction
    @Query("SELECT * FROM track_download")
    abstract fun observeTracks(): Flow<List<StoredDownload>>

    @Query("SELECT * FROM offline_album")
    abstract fun observeAlbums(): Flow<List<OfflineAlbumEntity>>

    @Query("SELECT * FROM offline_playlist")
    abstract fun observePlaylists(): Flow<List<OfflinePlaylistEntity>>

    @Query("SELECT * FROM offline_playlist_track ORDER BY playlistId, position")
    abstract fun observePlaylistTracks(): Flow<List<OfflinePlaylistTrackEntity>>

    @Query("SELECT * FROM offline_artwork")
    abstract fun observeArtwork(): Flow<List<OfflineArtworkEntity>>

    // Replaces a whole album's downloads; keepFileIds lists the playable files of each
    // track's source, which already count as downloaded at another quality.
    @Transaction
    open suspend fun saveAlbum(
        album: OfflineAlbumEntity,
        rows: List<StoredDownload>,
        keepFileIds: Map<Long, Set<String>>,
    ) {
        upsertAlbum(album.copy(downloadedAt = album(album.albumId)?.downloadedAt ?: album.downloadedAt))
        deleteAlbumTracksExcept(album.albumId, rows.map { it.download.trackId })
        rows.forEach { row ->
            val download = row.download
            val existing = track(download.trackId)
            val keep =
                existing != null &&
                    existing.status != DownloadStatus.Failed &&
                    existing.fileId in keepFileIds[download.trackId].orEmpty()
            val saved =
                if (keep) {
                    existing.copy(position = download.position, track = download.track)
                } else {
                    download.copy(played = existing?.played ?: false)
                }
            saveTrack(row.copy(download = saved))
        }
    }

    @Transaction
    open suspend fun savePlayed(
        album: OfflineAlbumEntity,
        row: StoredDownload,
    ): Boolean {
        val existing = track(row.download.trackId)
        if (existing != null && existing.status != DownloadStatus.Failed) {
            markPlayed(row.download.trackId)
            return false
        }
        insertAlbumIfAbsent(album)
        saveTrack(row.copy(download = row.download.copy(played = true)))
        return true
    }

    @Transaction
    open suspend fun savePlaylist(
        playlist: OfflinePlaylistEntity,
        entries: List<OfflinePlaylistTrackEntity>,
        albums: List<OfflineAlbumEntity>,
        rows: List<StoredDownload>,
    ) {
        upsertPlaylist(
            playlist.copy(downloadedAt = playlist(playlist.playlistId)?.downloadedAt ?: playlist.downloadedAt),
        )
        deletePlaylistTracks(playlist.playlistId)
        insertPlaylistTracks(entries)
        albums.forEach { insertAlbumIfAbsent(it) }
        rows.forEach { row ->
            val existing = track(row.download.trackId)
            when {
                existing == null -> saveTrack(row)
                existing.status == DownloadStatus.Failed -> requeue(row.download.trackId)
            }
        }
    }

    @Transaction
    open suspend fun removeAlbums(albumIds: List<Long>) {
        albumIds.forEach { albumId ->
            unsetWhole(albumId)
            clearPlayed(albumId)
        }
        prune()
    }

    @Transaction
    open suspend fun removePlaylists(playlistIds: List<Long>) {
        playlistIds.forEach {
            deletePlaylistTracks(it)
            deletePlaylist(it)
        }
        prune()
    }

    // Drops downloads nothing holds anymore: a whole album, a playlist, or a played save.
    @Transaction
    open suspend fun prune() {
        deleteUnheldTracks()
        deleteEmptyAlbums()
    }

    @Query("SELECT * FROM offline_album WHERE albumId = :albumId")
    abstract suspend fun album(albumId: Long): OfflineAlbumEntity?

    @Query("SELECT * FROM offline_playlist WHERE playlistId = :playlistId")
    abstract suspend fun playlist(playlistId: Long): OfflinePlaylistEntity?

    @Query("SELECT * FROM track_download WHERE trackId = :trackId")
    abstract suspend fun track(trackId: Long): TrackDownloadEntity?

    @Transaction
    @Query(
        "SELECT * FROM track_download WHERE status IN ('Queued', 'Downloading') " +
            "ORDER BY albumId, position LIMIT 1",
    )
    abstract suspend fun nextPending(): StoredDownload?

    @Query("SELECT COUNT(*) FROM track_download WHERE status IN ('Queued', 'Downloading')")
    abstract suspend fun pendingCount(): Int

    @Transaction
    @Query(
        "SELECT * FROM track_download WHERE played = 1 AND status = 'Downloaded' " +
            "AND albumId NOT IN (SELECT albumId FROM offline_album WHERE whole = 1) " +
            "AND trackId NOT IN (SELECT trackId FROM offline_playlist_track)",
    )
    abstract suspend fun upgradeCandidates(): List<StoredDownload>

    @Query("SELECT EXISTS(SELECT 1 FROM track_download WHERE trackId = :trackId AND fileId = :fileId)")
    abstract suspend fun hasDownload(
        trackId: Long,
        fileId: String,
    ): Boolean

    @Query(
        "UPDATE track_download SET status = :status, error = :error " +
            "WHERE trackId = :trackId AND fileId = :fileId",
    )
    abstract suspend fun updateStatus(
        trackId: Long,
        fileId: String,
        status: DownloadStatus,
        error: String?,
    )

    @Query(
        "UPDATE track_download SET status = 'Downloaded', error = NULL, sizeInBytes = :sizeInBytes " +
            "WHERE trackId = :trackId AND fileId = :fileId",
    )
    abstract suspend fun markDownloaded(
        trackId: Long,
        fileId: String,
        sizeInBytes: Long,
    )

    @Query(
        "UPDATE track_download SET fileId = :newFileId, fileName = :fileName, sizeInBytes = :sizeInBytes " +
            "WHERE trackId = :trackId AND fileId = :oldFileId AND status = 'Downloaded'",
    )
    abstract suspend fun replaceFile(
        trackId: Long,
        oldFileId: String,
        newFileId: String,
        fileName: String,
        sizeInBytes: Long,
    )

    @Query("UPDATE track_download SET status = 'Queued', error = NULL WHERE trackId = :trackId")
    abstract suspend fun requeue(trackId: Long)

    @Query("UPDATE track_download SET status = 'Queued', error = NULL WHERE status = 'Failed' AND trackId IN (:trackIds)")
    abstract suspend fun retry(trackIds: List<Long>)

    @Query("UPDATE offline_album SET title = :title, artists = :artists, coverUrl = :coverUrl WHERE albumId = :albumId")
    abstract suspend fun updateAlbumDetails(
        albumId: Long,
        title: String,
        artists: String?,
        coverUrl: String?,
    )

    @Upsert
    abstract suspend fun upsertArtwork(artwork: OfflineArtworkEntity)

    @Query("DELETE FROM offline_artwork WHERE url NOT IN (:urls)")
    abstract suspend fun deleteArtworkExcept(urls: List<String>)

    @Query("SELECT * FROM offline_artwork")
    abstract suspend fun artwork(): List<OfflineArtworkEntity>

    @Query("SELECT fileName FROM track_download")
    abstract suspend fun audioFileNames(): List<String>

    @Query("SELECT coverUrl FROM track_download WHERE coverUrl IS NOT NULL")
    abstract suspend fun trackCoverUrls(): List<String>

    @Upsert
    protected abstract suspend fun upsertAlbum(album: OfflineAlbumEntity)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    protected abstract suspend fun insertAlbumIfAbsent(album: OfflineAlbumEntity)

    private suspend fun saveTrack(row: StoredDownload) {
        upsertTrack(row.download)
        deleteArtists(row.download.trackId)
        insertArtists(row.artists)
    }

    @Upsert
    protected abstract suspend fun upsertTrack(track: TrackDownloadEntity)

    @Query("DELETE FROM track_download_artist WHERE trackId = :trackId")
    protected abstract suspend fun deleteArtists(trackId: Long)

    @Insert
    protected abstract suspend fun insertArtists(artists: List<TrackDownloadArtistEntity>)

    @Upsert
    protected abstract suspend fun upsertPlaylist(playlist: OfflinePlaylistEntity)

    @Insert
    protected abstract suspend fun insertPlaylistTracks(tracks: List<OfflinePlaylistTrackEntity>)

    @Query("UPDATE track_download SET played = 1 WHERE trackId = :trackId")
    protected abstract suspend fun markPlayed(trackId: Long)

    // Tracks still held by a playlist or a played save stay.
    @Query(
        "DELETE FROM track_download WHERE albumId = :albumId AND trackId NOT IN (:trackIds) " +
            "AND played = 0 AND trackId NOT IN (SELECT trackId FROM offline_playlist_track)",
    )
    protected abstract suspend fun deleteAlbumTracksExcept(
        albumId: Long,
        trackIds: List<Long>,
    )

    @Query("UPDATE offline_album SET whole = 0 WHERE albumId = :albumId")
    protected abstract suspend fun unsetWhole(albumId: Long)

    @Query("UPDATE track_download SET played = 0 WHERE albumId = :albumId")
    protected abstract suspend fun clearPlayed(albumId: Long)

    @Query("DELETE FROM offline_playlist_track WHERE playlistId = :playlistId")
    protected abstract suspend fun deletePlaylistTracks(playlistId: Long)

    @Query("DELETE FROM offline_playlist WHERE playlistId = :playlistId")
    protected abstract suspend fun deletePlaylist(playlistId: Long)

    @Query(
        "DELETE FROM track_download WHERE played = 0 " +
            "AND albumId NOT IN (SELECT albumId FROM offline_album WHERE whole = 1) " +
            "AND trackId NOT IN (SELECT trackId FROM offline_playlist_track)",
    )
    protected abstract suspend fun deleteUnheldTracks()

    @Query(
        "DELETE FROM offline_album WHERE whole = 0 " +
            "AND albumId NOT IN (SELECT albumId FROM track_download)",
    )
    protected abstract suspend fun deleteEmptyAlbums()
}
