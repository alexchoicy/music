package com.alexchoicy.music.data

import androidx.room3.Embedded
import com.alexchoicy.music.api.ApiJson
import com.alexchoicy.music.api.AudioFile
import com.alexchoicy.music.api.PlaybackTrack
import com.alexchoicy.music.api.TrackArtist
import kotlinx.serialization.json.jsonObject

// A PlaybackTrack kept on the phone; its ids and artists are columns and rows of the owning table.
data class StoredTrack(
    val albumDiscId: Long?,
    val title: String,
    val albumTitle: String,
    val coverUrl: String?,
    val durationMs: Long,
    val contentType: String,
    val versionType: String,
    @Embedded(prefix = "original_") val original: AudioFile,
    @Embedded(prefix = "opus96_") val opus96: AudioFile?,
    // The API's audio object as received, so a transfer can pass it on unchanged.
    val audio: String,
    val languageId: Long?,
    val albumLanguageId: Long?,
)

fun PlaybackTrack.toStored() =
    StoredTrack(
        albumDiscId = albumDiscId,
        title = title,
        albumTitle = albumTitle,
        coverUrl = coverUrl,
        durationMs = durationMs,
        contentType = contentType,
        versionType = versionType,
        original = original,
        opus96 = opus96,
        audio = audio.toString(),
        languageId = languageId,
        albumLanguageId = albumLanguageId,
    )

fun StoredTrack.toPlaybackTrack(
    trackId: Long,
    albumId: Long,
    artists: List<TrackArtist>,
) = PlaybackTrack(
    albumId = albumId,
    albumDiscId = albumDiscId,
    trackId = trackId,
    title = title,
    artists = artists,
    albumTitle = albumTitle,
    coverUrl = coverUrl,
    durationMs = durationMs,
    contentType = contentType,
    versionType = versionType,
    original = original,
    opus96 = opus96,
    audio = ApiJson.parseToJsonElement(audio).jsonObject,
    languageId = languageId,
    albumLanguageId = albumLanguageId,
)
