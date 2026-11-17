package com.alexchoicy.music.data.lyrics

import androidx.room3.Dao
import androidx.room3.Insert
import androidx.room3.Query
import androidx.room3.Transaction
import androidx.room3.Upsert
import com.alexchoicy.music.api.LyricVersion
import com.alexchoicy.music.api.Lyrics
import com.alexchoicy.music.data.MusicDatabase
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Dao
abstract class LyricsDao(
    private val database: MusicDatabase,
) {
    fun observeVersions(trackId: Long): Flow<List<LyricVersion>?> =
        database.invalidationTracker
            .createFlow("track_lyrics", "lyric_version")
            .map { loadVersions(trackId) }

    fun observeLyrics(subtitleId: Long): Flow<Lyrics?> =
        database.invalidationTracker
            .createFlow("lyrics")
            .map { lyrics(subtitleId)?.toLyrics() }

    @Transaction
    open suspend fun loadVersions(trackId: Long): List<LyricVersion>? {
        trackLyrics(trackId) ?: return null
        return versions(trackId).map { it.toVersion() }
    }

    @Transaction
    open suspend fun replaceVersions(
        trackId: Long,
        versions: List<LyricVersion>,
    ) {
        upsertTrackLyrics(TrackLyricsEntity(trackId))
        deleteVersions(trackId)
        insertVersions(versions.mapIndexed { position, version -> version.toEntity(trackId, position) })
    }

    @Query("SELECT * FROM track_lyrics WHERE trackId = :trackId")
    protected abstract suspend fun trackLyrics(trackId: Long): TrackLyricsEntity?

    @Query("SELECT * FROM lyric_version WHERE trackId = :trackId ORDER BY position")
    protected abstract suspend fun versions(trackId: Long): List<LyricVersionEntity>

    @Query("SELECT * FROM lyrics WHERE subtitleId = :subtitleId")
    protected abstract suspend fun lyrics(subtitleId: Long): LyricsEntity?

    @Upsert
    protected abstract suspend fun upsertTrackLyrics(entity: TrackLyricsEntity)

    @Query("DELETE FROM lyric_version WHERE trackId = :trackId")
    protected abstract suspend fun deleteVersions(trackId: Long)

    @Insert
    protected abstract suspend fun insertVersions(versions: List<LyricVersionEntity>)

    @Upsert
    abstract suspend fun upsertLyrics(entity: LyricsEntity)
}
