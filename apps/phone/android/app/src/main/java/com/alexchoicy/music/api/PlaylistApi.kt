package com.alexchoicy.music.api

import io.ktor.client.request.parameter
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

data class PlaylistSummary(
    val id: Long,
    val name: String,
    // Null for a downloaded copy, which can't be edited.
    val version: Long?,
    val trackCount: Int,
    val totalDurationMs: Long,
    val coverUrls: List<String>,
)

data class PlaylistEntry(
    // Null for a downloaded copy.
    val entryId: Long?,
    val albumId: Long,
    val trackId: Long,
    val title: String,
    val albumTitle: String,
    val artists: List<TrackArtist>,
    val durationMs: Long,
    val coverUrl: String?,
    // Null without audio the phone can play.
    val track: PlaybackTrack?,
)

data class PlaylistDetail(
    val id: Long,
    val name: String,
    // Null for a downloaded copy, which can't be edited.
    val version: Long?,
    val entries: List<PlaylistEntry>,
) {
    val tracks get() = entries.mapNotNull { it.track }
    val totalDurationMs get() = entries.sumOf { it.durationMs }
    val coverUrls get() = entries.mapNotNull { it.coverUrl }.distinct().take(4)
}

enum class PlaylistEdit { Done, Conflict, Failed }

class PlaylistApi(
    private val client: ApiClient,
) {
    suspend fun fetchPlaylists(): ApiOutcome<List<PlaylistSummary>> =
        apiOutcome {
            client.get<List<PlaylistListItemDto>>("/playlists").map { it.toSummary() }
        }

    suspend fun fetchPlaylist(id: Long): ApiOutcome<PlaylistDetail> =
        apiOutcome {
            client.get<PlaylistDto>("/playlists/$id").toDetail()
        }

    suspend fun create(name: String): ApiOutcome<PlaylistDetail> =
        apiOutcome {
            client
                .postOrNull<CreatePlaylistDto, PlaylistDto>("/playlists", CreatePlaylistDto(name))
                ?.toDetail() ?: error("No playlist returned")
        }

    suspend fun rename(
        id: Long,
        version: Long,
        name: String,
    ) = edit { client.put("/playlists/$id", RenamePlaylistDto(name, version)) }

    suspend fun delete(
        id: Long,
        version: Long,
    ) = edit { client.delete("/playlists/$id") { parameter("version", version) } }

    suspend fun addTrack(
        id: Long,
        version: Long,
        albumDiscId: Long,
        trackId: Long,
    ) = edit {
        client.post(
            "/playlists/$id/entries",
            AddPlaylistEntriesDto(version, listOf(PlaylistTrackDto(albumDiscId, trackId))),
        )
    }

    suspend fun removeEntry(
        id: Long,
        version: Long,
        entryId: Long,
    ) = edit { client.delete("/playlists/$id/entries/$entryId") { parameter("version", version) } }

    // version guards against editing a playlist changed elsewhere, which the server rejects with 409.
    private suspend fun edit(block: suspend () -> Unit): PlaylistEdit =
        try {
            block()
            PlaylistEdit.Done
        } catch (e: CancellationException) {
            throw e
        } catch (e: HttpStatusException) {
            if (e.status == 409) PlaylistEdit.Conflict else PlaylistEdit.Failed
        } catch (_: Exception) {
            PlaylistEdit.Failed
        }
}

@Serializable
private class CreatePlaylistDto(
    val name: String,
)

@Serializable
private class RenamePlaylistDto(
    val name: String,
    val version: Long,
)

@Serializable
private class AddPlaylistEntriesDto(
    val version: Long,
    val tracks: List<PlaylistTrackDto>,
)

@Serializable
private class PlaylistTrackDto(
    val albumDiscId: Long,
    val trackId: Long,
)

@Serializable
private class PlaylistListItemDto(
    val playlistId: Long,
    val name: String,
    val version: Long,
    val trackCount: Int,
    val totalDurationInMs: Long,
    val covers: List<PlaylistCoverDto> = emptyList(),
)

@Serializable
private class PlaylistCoverDto(
    val file: FileDto? = null,
)

@Serializable
private class PlaylistDto(
    val playlistId: Long,
    val name: String,
    val version: Long,
    val entries: List<PlaylistEntryDto>,
)

@Serializable
private class PlaylistEntryDto(
    val entryId: Long,
    val albumId: Long,
    val albumTitle: String,
    val albumLanguageId: Long? = null,
    val albumDiscId: Long,
    val trackId: Long,
    val title: String,
    val languageId: Long? = null,
    val durationInMs: Long,
    val contentType: String,
    val versionType: String,
    val cover: ImageVariantsDto? = null,
    val credits: List<PlaybackCreditDto>,
    val audios: List<JsonObject>,
)

private fun PlaylistListItemDto.toSummary() =
    PlaylistSummary(
        id = playlistId,
        name = name,
        version = version,
        trackCount = trackCount,
        totalDurationMs = totalDurationInMs,
        coverUrls = covers.mapNotNull { it.file?.url?.ifEmpty { null } },
    )

private fun PlaylistDto.toDetail() =
    PlaylistDetail(
        id = playlistId,
        name = name,
        version = version,
        entries = entries.map { it.toEntry() },
    )

private fun PlaylistEntryDto.toEntry(): PlaylistEntry {
    val artists = credits.distinctBy { it.partyId }.map { TrackArtist(it.partyId, it.name) }
    val coverUrl = cover?.url { imageCover1024x1024 }
    return PlaylistEntry(
        entryId = entryId,
        albumId = albumId,
        trackId = trackId,
        title = title,
        albumTitle = albumTitle,
        artists = artists,
        durationMs = durationInMs,
        coverUrl = coverUrl,
        track = toTrack(artists, coverUrl),
    )
}

private fun PlaylistEntryDto.toTrack(
    artists: List<TrackArtist>,
    coverUrl: String?,
): PlaybackTrack? {
    val audio = audios.preferredAudio() ?: return null
    val (original, opus96) = audio.toAudioFiles() ?: return null
    return PlaybackTrack(
        albumId = albumId,
        albumDiscId = albumDiscId,
        trackId = trackId,
        title = title,
        artists = artists,
        albumTitle = albumTitle,
        coverUrl = coverUrl,
        durationMs = durationInMs,
        contentType = contentType,
        versionType = versionType,
        original = original,
        opus96 = opus96,
        audio = audio,
        languageId = languageId,
        albumLanguageId = albumLanguageId,
    )
}
