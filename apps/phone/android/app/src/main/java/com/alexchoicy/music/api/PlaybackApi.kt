package com.alexchoicy.music.api

import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlin.math.roundToInt

data class TrackArtist(
    val partyId: Long,
    val name: String,
)

@Serializable
data class AudioFile(
    val id: String,
    val extension: String,
    val sizeInBytes: Long = 0,
    val codec: String? = null,
    val audioSampleRate: Int? = null,
    val bitsPerSample: Int? = null,
    val bitrate: Int? = null,
) {
    val playable get() = extension.trimStart('.').lowercase() != "dsf"
    val formatName get() = extension.trimStart('.').uppercase()
}

data class PlaybackTrack(
    val albumId: Long,
    val albumDiscId: Long? = null,
    val trackId: Long,
    val title: String,
    val artists: List<TrackArtist>,
    val albumTitle: String,
    val coverUrl: String?,
    val durationMs: Long,
    val contentType: String,
    val versionType: String,
    val original: AudioFile,
    val opus96: AudioFile?,
    // The API's audio object, passed on unchanged when playback moves to another device.
    val audio: JsonObject,
    val languageId: Long? = null,
    val albumLanguageId: Long? = null,
) {
    val artistNames get() = artists.joinToString(", ") { it.name }.ifEmpty { null }

    fun file(id: String) = listOfNotNull(original, opus96).firstOrNull { it.id == id }

    fun qualityLabel(file: AudioFile) = file.qualityLabel(opus = file.id == opus96?.id)
}

data class PlaybackAlbum(
    val albumId: Long,
    val title: String,
    val artists: String?,
    val coverUrl: String?,
    val tracks: List<PlaybackTrack>,
)

data class PlaybackPlaylist(
    val playlistId: Long,
    val name: String,
    val tracks: List<PlaybackTrack>,
)

class PlaybackApi(
    private val client: ApiClient,
) {
    suspend fun fetchAlbum(albumId: Long): ApiOutcome<PlaybackAlbum> =
        apiOutcome {
            client.get<PlaybackAlbumDto>("/albums/$albumId").toAlbum()
        }

    suspend fun fetchAlbums(albumIds: List<Long>): ApiOutcome<List<PlaybackAlbum>> =
        apiOutcome {
            coroutineScope {
                albumIds
                    .map { async { client.get<PlaybackAlbumDto>("/albums/$it").toAlbum() } }
                    .awaitAll()
            }
        }

    suspend fun fetchPlaylist(playlistId: Long): ApiOutcome<PlaybackPlaylist> =
        apiOutcome {
            val playlist = client.get<PlaylistDto>("/playlists/$playlistId")
            PlaybackPlaylist(
                playlistId = playlist.playlistId,
                name = playlist.name,
                tracks = playlist.entries.mapNotNull { it.toTrack() },
            )
        }

    suspend fun radioTrack(
        queueTrackIds: List<Long>,
        includeInstrumental: Boolean,
    ): ApiOutcome<PlaybackTrack?> =
        apiOutcome {
            val pick =
                client.postOrNull<RadioRequestDto, RadioTrackDto>(
                    "/tracks/radio",
                    RadioRequestDto(queueTrackIds.distinct(), includeInstrumental),
                ) ?: return@apiOutcome null
            client
                .get<PlaybackAlbumDto>("/albums/${pick.albumId}")
                .toAlbum()
                .tracks
                .firstOrNull { it.trackId == pick.trackId }
        }

    suspend fun fileUrl(fileId: String): String = client.getText("/files/$fileId").trim()

    suspend fun recordListen(
        albumId: Long,
        trackId: Long,
    ) {
        client.post("/history", RecordListenDto(albumId, trackId))
    }
}

internal fun JsonObject.toAudioFiles(): Pair<AudioFile, AudioFile?>? {
    val files =
        runCatching { ApiJson.decodeFromJsonElement<TrackAudioDto>(this).file }
            .getOrNull() ?: return null
    return files.original to files.opus96
}

@Serializable
private class RecordListenDto(
    val albumId: Long,
    val trackId: Long,
)

@Serializable
private class RadioRequestDto(
    val queueTrackIds: List<Long>,
    val includeInstrumental: Boolean,
)

@Serializable
private class RadioTrackDto(
    val albumId: Long,
    val trackId: Long,
)

@Serializable
private class PlaybackAlbumDto(
    val albumId: Long,
    val title: String,
    val languageId: Long? = null,
    val cover: PlaybackCoverDto,
    val credits: List<PlaybackCreditDto> = emptyList(),
    val discs: List<PlaybackDiscDto>,
)

@Serializable
private class PlaybackCoverDto(
    val album: ImageVariantsDto? = null,
    val discs: List<PlaybackDiscCoverDto> = emptyList(),
)

@Serializable
private class PlaybackDiscCoverDto(
    val albumDiscId: Long,
    val variants: ImageVariantsDto,
)

@Serializable
private class PlaybackDiscDto(
    val albumDiscId: Long,
    val tracks: List<PlaybackTrackDto>,
)

@Serializable
private class PlaybackTrackDto(
    val trackId: Long,
    val title: String,
    val languageId: Long? = null,
    val durationInMs: Long,
    val contentType: String,
    val versionType: String,
    val credits: List<PlaybackCreditDto>,
    val audios: List<JsonObject>,
)

@Serializable
private class PlaybackCreditDto(
    val partyId: Long,
    val name: String,
)

@Serializable
private class PlaylistDto(
    val playlistId: Long,
    val name: String,
    val entries: List<PlaylistEntryDto>,
)

@Serializable
private class PlaylistEntryDto(
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

@Serializable
private class TrackAudioDto(
    val pinned: Boolean = false,
    val file: TrackAudioFilesDto,
)

@Serializable
private class TrackAudioFilesDto(
    val original: AudioFile,
    val opus96: AudioFile? = null,
)

private val LosslessCodecs = setOf("flac", "alac", "pcm", "wav", "aiff", "ape", "wavpack", "dsd")

private fun AudioFile.qualityLabel(opus: Boolean): String {
    val codec = codec?.trim()?.lowercase().orEmpty()
    val extension = extension.trimStart('.').lowercase()
    val lossless =
        codec in LosslessCodecs ||
            codec.startsWith("pcm") ||
            codec.startsWith("dsd") ||
            extension in LosslessCodecs ||
            extension == "dsf"
    val tier =
        when {
            opus -> "Opus 96"
            !lossless -> "Original"
            (audioSampleRate ?: 0) > 48_000 || (bitsPerSample ?: 0) > 16 -> "Hi-Res"
            else -> "Lossless"
        }
    return listOfNotNull(
        tier,
        audioSampleRate?.let { "${(it / 1000.0).toString().removeSuffix(".0")} kHz" },
        bitrate?.let { "${(it / 1000.0).roundToInt()} kbps" },
    ).joinToString(" · ")
}

private fun List<JsonObject>.preferredAudio(): JsonObject? {
    val audios =
        mapNotNull { audio ->
            runCatching { ApiJson.decodeFromJsonElement<TrackAudioDto>(audio) }
                .getOrNull()
                ?.let { audio to it }
        }
    return (audios.firstOrNull { it.second.pinned } ?: audios.firstOrNull())?.first
}

private fun PlaybackAlbumDto.toAlbum(): PlaybackAlbum {
    val albumCover = cover.album?.url { imageCover1024x1024 }
    val tracks =
        discs.flatMap { disc ->
            val discCover =
                cover.discs
                    .firstOrNull { it.albumDiscId == disc.albumDiscId }
                    ?.variants
                    ?.url { imageCover1024x1024 }
            disc.tracks.mapNotNull { track ->
                val audio = track.audios.preferredAudio() ?: return@mapNotNull null
                val (original, opus96) = audio.toAudioFiles() ?: return@mapNotNull null
                PlaybackTrack(
                    albumId = albumId,
                    albumDiscId = disc.albumDiscId,
                    trackId = track.trackId,
                    title = track.title,
                    artists =
                        track.credits
                            .distinctBy { it.partyId }
                            .map { TrackArtist(it.partyId, it.name) },
                    albumTitle = title,
                    coverUrl = discCover ?: albumCover,
                    durationMs = track.durationInMs,
                    contentType = track.contentType,
                    versionType = track.versionType,
                    original = original,
                    opus96 = opus96,
                    audio = audio,
                    languageId = track.languageId,
                    albumLanguageId = languageId,
                )
            }
        }
    return PlaybackAlbum(
        albumId = albumId,
        title = title,
        artists =
            credits
                .map { it.name }
                .distinct()
                .joinToString(", ")
                .ifEmpty { null },
        coverUrl =
            albumCover ?: cover.discs
                .firstOrNull()
                ?.variants
                ?.url { imageCover1024x1024 },
        tracks = tracks,
    )
}

private fun PlaylistEntryDto.toTrack(): PlaybackTrack? {
    val audio = audios.preferredAudio() ?: return null
    val (original, opus96) = audio.toAudioFiles() ?: return null
    return PlaybackTrack(
        albumId = albumId,
        albumDiscId = albumDiscId,
        trackId = trackId,
        title = title,
        artists = credits.distinctBy { it.partyId }.map { TrackArtist(it.partyId, it.name) },
        albumTitle = albumTitle,
        coverUrl = cover?.url { imageCover1024x1024 },
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
