package com.alexchoicy.music.api

import io.ktor.client.request.parameter
import kotlinx.serialization.Serializable

data class MatchedTrack(
    val trackId: Long,
    val discNumber: Int,
    val trackNumber: Int,
    val title: String,
    val basedOnTitle: String?,
    val coverUrl: String?,
)

data class SearchAlbum(
    val album: AlbumSummary,
    val matchedTracks: List<MatchedTrack>,
)

data class SearchResults(
    val albums: List<SearchAlbum>,
    val parties: List<PartySummary>,
)

class SearchApi(
    private val client: ApiClient,
) {
    suspend fun search(query: String): ApiOutcome<SearchResults> =
        apiOutcome {
            client.get<SearchDto>("/search") { parameter("Query", query) }.toResults()
        }
}

@Serializable
private class SearchDto(
    val albums: List<AlbumDto>,
    val parties: List<PartyDto>,
)

private fun SearchDto.toResults() =
    SearchResults(
        albums =
            albums.map { album ->
                val summary = album.toAlbum()
                SearchAlbum(
                    album = summary,
                    matchedTracks =
                        album.matchedTracks.map { track ->
                            MatchedTrack(
                                trackId = track.trackId,
                                discNumber = track.discNumber,
                                trackNumber = track.trackNumber,
                                title = track.title,
                                basedOnTitle = track.basedOnTrackTitle,
                                coverUrl =
                                    album.discCovers
                                        .firstOrNull { it.discNumber == track.discNumber }
                                        ?.variants
                                        ?.url { imageCover1024x1024 } ?: summary.coverUrl,
                            )
                        },
                )
            },
        parties = parties.map { it.toParty() },
    )
