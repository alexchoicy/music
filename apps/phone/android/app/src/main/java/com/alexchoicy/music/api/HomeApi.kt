package com.alexchoicy.music.api

import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.serialization.Serializable
import java.time.Instant

data class LibraryStats(
    val albumCount: Long,
    val partyCount: Long,
)

data class ContinueListeningItem(
    val deviceId: String,
    val deviceName: String,
    val trackId: Long,
    val trackTitle: String,
    val durationMs: Long,
    val positionMs: Long,
    val updatedAt: Instant?,
    val album: AlbumSummary,
)

data class HomeFeed(
    val stats: LibraryStats,
    val recentlyPlayed: List<AlbumSummary>,
    val recentAlbums: List<AlbumSummary>,
    val recentParties: List<PartySummary>,
)

data class HomeResponse(
    val feed: HomeFeed,
    val continueListening: List<ContinueListeningItem>,
)

class HomeApi(
    private val client: ApiClient,
) {
    suspend fun fetchHome(): ApiOutcome<HomeResponse> =
        apiOutcome {
            coroutineScope {
                val stats = async { client.get<StatsDto>("/stats") }
                val home = async { client.get<HomeDto>("/home") }
                home.await().toResponse(stats.await())
            }
        }
}

@Serializable
private class StatsDto(
    val albumCount: Long,
    val artistCount: Long,
)

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
    val trackId: Long,
    val trackTitle: String,
    val durationInMs: Long,
    val positionMs: Long,
    val updatedAt: String,
    val album: AlbumDto,
)

private fun HomeDto.toResponse(stats: StatsDto) =
    HomeResponse(
        feed =
            HomeFeed(
                stats =
                    LibraryStats(
                        albumCount = stats.albumCount,
                        partyCount = stats.artistCount,
                    ),
                recentlyPlayed = recentlyPlayed.map { it.toAlbum() },
                recentAlbums = recentAlbums.map { it.toAlbum() },
                recentParties = recentParties.map { it.toParty() },
            ),
        continueListening =
            continueListening.map {
                ContinueListeningItem(
                    deviceId = it.deviceId,
                    deviceName = it.deviceName,
                    trackId = it.trackId,
                    trackTitle = it.trackTitle,
                    durationMs = it.durationInMs,
                    positionMs = it.positionMs,
                    updatedAt = parseInstant(it.updatedAt),
                    album = it.album.toAlbum(),
                )
            },
    )
