package com.alexchoicy.music.data.home

import androidx.room3.Dao
import androidx.room3.Insert
import androidx.room3.Query
import androidx.room3.Transaction
import androidx.room3.Upsert
import com.alexchoicy.music.api.AlbumSummary
import com.alexchoicy.music.api.ContinueListeningItem
import com.alexchoicy.music.api.HomeFeed
import com.alexchoicy.music.data.MusicDatabase
import com.alexchoicy.music.data.library.AlbumArtistEntity
import com.alexchoicy.music.data.library.AlbumEntity
import com.alexchoicy.music.data.library.PartyEntity
import com.alexchoicy.music.data.library.toArtistEntities
import com.alexchoicy.music.data.library.toEntity
import com.alexchoicy.music.data.library.toSummary
import java.time.Instant
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Dao
abstract class HomeDao(private val database: MusicDatabase) {
    fun observe(): Flow<HomeFeed?> = database.invalidationTracker
        .createFlow(
            "home",
            "home_continue_listening",
            "home_album",
            "home_party",
            "album",
            "album_artist",
            "party",
        )
        .map { load() }

    @Transaction
    open suspend fun load(): HomeFeed? {
        val home = home() ?: return null
        return HomeFeed(
            stats = home.stats,
            continueListening = continueListening().mapNotNull { (entry, album) ->
                album ?: return@mapNotNull null
                ContinueListeningItem(
                    deviceId = entry.deviceId,
                    deviceName = entry.deviceName,
                    trackTitle = entry.trackTitle,
                    durationMs = entry.durationMs,
                    positionMs = entry.positionMs,
                    updatedAt = entry.updatedAtMs?.let(Instant::ofEpochMilli),
                    album = album.toSummary(),
                )
            },
            recentlyPlayed = albums(HomeAlbumSection.RecentlyPlayed).mapNotNull {
                it.album?.toSummary()
            },
            recentAlbums = albums(HomeAlbumSection.RecentAlbums).mapNotNull {
                it.album?.toSummary()
            },
            recentParties = parties().mapNotNull { it.party?.toSummary() },
        )
    }

    @Transaction
    open suspend fun replace(feed: HomeFeed) {
        val albums = (
            feed.continueListening.map { it.album } + feed.recentlyPlayed +
                feed.recentAlbums
            )
            .distinctBy { it.id }
        upsertAlbums(albums.map { it.toEntity() })
        deleteAlbumArtists(albums.map { it.id })
        insertAlbumArtists(albums.flatMap { it.toArtistEntities() })
        upsertParties(feed.recentParties.map { it.toEntity() })

        deleteHome()
        deleteContinueListening()
        deleteHomeAlbums()
        deleteHomeParties()
        insertHome(HomeEntity(stats = feed.stats))
        insertContinueListening(
            feed.continueListening.mapIndexed { position, item ->
                HomeContinueListeningEntity(
                    position = position,
                    deviceId = item.deviceId,
                    deviceName = item.deviceName,
                    trackTitle = item.trackTitle,
                    durationMs = item.durationMs,
                    positionMs = item.positionMs,
                    updatedAtMs = item.updatedAt?.toEpochMilli(),
                    albumId = item.album.id,
                )
            },
        )
        insertHomeAlbums(
            homeAlbums(HomeAlbumSection.RecentlyPlayed, feed.recentlyPlayed) +
                homeAlbums(HomeAlbumSection.RecentAlbums, feed.recentAlbums),
        )
        insertHomeParties(
            feed.recentParties.mapIndexed { position, party ->
                HomePartyEntity(position, party.id)
            },
        )
    }

    private fun homeAlbums(section: HomeAlbumSection, albums: List<AlbumSummary>) =
        albums.mapIndexed { position, album -> HomeAlbumEntity(section, position, album.id) }

    @Query("SELECT * FROM home")
    protected abstract suspend fun home(): HomeEntity?

    @Transaction
    @Query("SELECT * FROM home_continue_listening ORDER BY position")
    protected abstract suspend fun continueListening(): List<HomeContinueListeningWithAlbum>

    @Transaction
    @Query("SELECT * FROM home_album WHERE section = :section ORDER BY position")
    protected abstract suspend fun albums(section: HomeAlbumSection): List<HomeAlbumWithAlbum>

    @Transaction
    @Query("SELECT * FROM home_party ORDER BY position")
    protected abstract suspend fun parties(): List<HomePartyWithParty>

    @Upsert
    protected abstract suspend fun upsertAlbums(albums: List<AlbumEntity>)

    @Query("DELETE FROM album_artist WHERE albumId IN (:albumIds)")
    protected abstract suspend fun deleteAlbumArtists(albumIds: List<Long>)

    @Insert
    protected abstract suspend fun insertAlbumArtists(artists: List<AlbumArtistEntity>)

    @Upsert
    protected abstract suspend fun upsertParties(parties: List<PartyEntity>)

    @Query("DELETE FROM home")
    protected abstract suspend fun deleteHome()

    @Query("DELETE FROM home_continue_listening")
    protected abstract suspend fun deleteContinueListening()

    @Query("DELETE FROM home_album")
    protected abstract suspend fun deleteHomeAlbums()

    @Query("DELETE FROM home_party")
    protected abstract suspend fun deleteHomeParties()

    @Insert
    protected abstract suspend fun insertHome(home: HomeEntity)

    @Insert
    protected abstract suspend fun insertContinueListening(items: List<HomeContinueListeningEntity>)

    @Insert
    protected abstract suspend fun insertHomeAlbums(albums: List<HomeAlbumEntity>)

    @Insert
    protected abstract suspend fun insertHomeParties(parties: List<HomePartyEntity>)
}
