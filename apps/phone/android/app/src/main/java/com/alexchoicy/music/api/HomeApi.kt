package com.alexchoicy.music.api

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.http.isSuccess
import java.time.Instant
import java.time.OffsetDateTime
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.serialization.Serializable

data class LibraryStats(val albumCount: Long, val partyCount: Long)

data class AlbumArtist(val partyId: Long, val name: String)

data class AlbumSummary(
    val id: Long,
    val title: String,
    val type: String,
    val coverUrl: String?,
    val artists: List<AlbumArtist>,
    val trackCount: Int,
    val totalDurationMs: Long,
) {
    val artistNames: String? get() = artists.joinToString(", ") { it.name }.ifEmpty { null }
}

data class PartySummary(val id: Long, val name: String, val coverUrl: String?, val albumCount: Int)

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

sealed interface HomeOutcome {
    data class Loaded(val feed: HomeFeed) : HomeOutcome
    data object Unauthorized : HomeOutcome
    data object Failed : HomeOutcome
}

private class UnauthorizedException : Exception()

class HomeApi(private val client: HttpClient) {
    suspend fun fetchHome(serverUrl: String, token: String): HomeOutcome = try {
        coroutineScope {
            val stats = async { get<StatsDto>(serverUrl, "/stats", token) }
            val home = async { get<HomeDto>(serverUrl, "/home", token) }
            HomeOutcome.Loaded(home.await().toFeed(stats.await()))
        }
    } catch (e: CancellationException) {
        throw e
    } catch (_: UnauthorizedException) {
        HomeOutcome.Unauthorized
    } catch (_: Exception) {
        HomeOutcome.Failed
    }

    private suspend inline fun <reified T> get(serverUrl: String, path: String, token: String): T {
        val response = client.get("https://$serverUrl$path") { bearerAuth(token) }
        when {
            response.status.value == 401 -> throw UnauthorizedException()
            !response.status.isSuccess() -> error("$path returned ${response.status.value}")
        }
        return response.body()
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

@Serializable
private class AlbumDto(
    val albumId: Long,
    val title: String,
    val type: String,
    val coverVariants: ImageVariantsDto? = null,
    val discCovers: List<DiscCoverDto> = emptyList(),
    val artists: List<ArtistDto>,
    val trackCount: Int,
    val totalDurationInMs: Long,
)

@Serializable
private class PartyDto(
    val partyId: Long,
    val name: String,
    val coverUrl: String? = null,
    val albumCount: Int,
)

@Serializable
private class DiscCoverDto(val variants: ImageVariantsDto)

@Serializable
private class ArtistDto(val partyId: Long, val name: String)

@Serializable
private class ImageVariantsDto(
    val original: FileDto? = null,
    val imageCover1024x1024: FileDto? = null,
)

@Serializable
private class FileDto(val url: String)

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
            updatedAt = runCatching { OffsetDateTime.parse(it.updatedAt).toInstant() }.getOrNull(),
            album = it.album.toAlbum(),
        )
    },
    recentlyPlayed = recentlyPlayed.map { it.toAlbum() },
    recentAlbums = recentAlbums.map { it.toAlbum() },
    recentParties = recentParties.map {
        PartySummary(
            id = it.partyId,
            name = it.name,
            coverUrl = it.coverUrl?.ifEmpty { null },
            albumCount = it.albumCount,
        )
    },
)

private fun AlbumDto.toAlbum() = AlbumSummary(
    id = albumId,
    title = title,
    type = type,
    coverUrl = coverVariants?.url { imageCover1024x1024 }
        ?: discCovers.firstOrNull()?.variants?.url { imageCover1024x1024 },
    artists = artists.map { AlbumArtist(it.partyId, it.name) },
    trackCount = trackCount,
    totalDurationMs = totalDurationInMs,
)

private fun ImageVariantsDto.url(variant: ImageVariantsDto.() -> FileDto?): String? =
    (variant() ?: original)?.url?.ifEmpty { null }
