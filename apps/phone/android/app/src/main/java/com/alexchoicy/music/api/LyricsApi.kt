package com.alexchoicy.music.api

import kotlinx.serialization.Serializable

@Serializable
data class LyricVersion(
    val subtitleId: Long,
    val title: String? = null,
    val format: String,
    val languageId: Long? = null,
    val languageName: String? = null,
) {
    val label get() = title?.ifBlank { null } ?: languageName ?: format
}

@Serializable
data class Lyrics(
    val subtitleId: Long,
    val languageId: Long? = null,
    val parsed: ParsedLyrics? = null,
    val plainText: String? = null,
)

@Serializable
data class ParsedLyrics(
    val singers: List<LyricSinger> = emptyList(),
    val lines: List<LyricLine> = emptyList(),
)

@Serializable
data class LyricSinger(
    val id: String,
    val name: String? = null,
    val kind: String,
)

@Serializable
data class LyricLine(
    val start: Double,
    val end: Double,
    val text: String,
    val singers: List<String> = emptyList(),
    val words: List<LyricWord> = emptyList(),
    val background: String? = null,
    val translations: List<LyricText> = emptyList(),
    val romanizations: List<LyricText> = emptyList(),
)

@Serializable
data class LyricWord(
    val start: Double,
    val text: String,
)

@Serializable
data class LyricText(
    val text: String,
)

class LyricsApi(
    private val client: ApiClient,
) {
    suspend fun versions(
        albumId: Long,
        trackId: Long,
    ): ApiOutcome<List<LyricVersion>> =
        apiOutcome {
            client
                .get<LyricsAlbumDto>("/albums/$albumId")
                .discs
                .flatMap { it.tracks }
                .firstOrNull { it.trackId == trackId }
                ?.subtitles
                .orEmpty()
        }

    suspend fun lyrics(subtitleId: Long): ApiOutcome<Lyrics> = apiOutcome { client.get<Lyrics>("/subtitles/$subtitleId/lyrics") }
}

@Serializable
private class LyricsAlbumDto(
    val discs: List<LyricsDiscDto>,
)

@Serializable
private class LyricsDiscDto(
    val tracks: List<LyricsTrackDto>,
)

@Serializable
private class LyricsTrackDto(
    val trackId: Long,
    val subtitles: List<LyricVersion> = emptyList(),
)
