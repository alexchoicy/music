package com.alexchoicy.music.api

import java.time.Instant
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.serialization.Serializable

data class LibraryStats(val albumCount: Long, val partyCount: Long)

data class ContinueListeningItem(
    val deviceId: String,
    val deviceName: String,
    val trackTitle: String,
    val durationMs: Long,
    val positionMs: Long,
    val updatedAt: Instant?,
    val album: AlbumSummary,
)

data class HomeFeed(
    val stats: LibraryStats,
    val continueListening: List<ContinueListeningItem>,
    val recentlyPlayed: List<AlbumSummary>,
    val recentAlbums: List<AlbumSummary>,
    val recentParties: List<PartySummary>,
)

class HomeApi(private val client: ApiClient) {
    suspend fun fetchHome(): ApiOutcome<HomeFeed> = apiOutcome {
        coroutineScope {
            val stats = async { client.get<StatsDto>("/stats") }
            val home = async { client.get<HomeDto>("/home") }
            home.await().toFeed(stats.await())
        }
    }
}

@Serializable
private class StatsDto(val albumCount: Long, val artistCount: Long)

@Serializable
private class HomeDto(
    val continueListening: List<ContinueListeningDto>,
    val recentlyPlayed: List<AlbumDto>,
    val recentAlbums: List<AlbumDto>,
    val recentParties: List<PartyDto>,
)

@Serializable
private class ContinueListeningDto(
    val deviceId: String,
    val deviceName: String,
    val trackTitle: String,
    val durationInMs: Long,
    val positionMs: Long,
    val updatedAt: String,
    val album: AlbumDto,
)

private fun HomeDto.toFeed(stats: StatsDto) = HomeFeed(
    stats = LibraryStats(
        albumCount = stats.albumCount,
        partyCount = stats.artistCount,
    ),
    continueListening = continueListening.map {
        ContinueListeningItem(
            deviceId = it.deviceId,
            deviceName = it.deviceName,
            trackTitle = it.trackTitle,
            durationMs = it.durationInMs,
            positionMs = it.positionMs,
            updatedAt = parseInstant(it.updatedAt),
            album = it.album.toAlbum(),
        )
    },
    recentlyPlayed = recentlyPlayed.map { it.toAlbum() },
    recentAlbums = recentAlbums.map { it.toAlbum() },
    recentParties = recentParties.map { it.toParty() },
)
