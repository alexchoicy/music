package com.alexchoicy.music.playback

import com.alexchoicy.music.api.PlaybackTrack
import com.alexchoicy.music.api.TrackArtist
import com.alexchoicy.music.api.toAudioFiles
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

// The queue moved between devices. The server relays it without reading it, so tracks
// use the web player's shape.
data class TransferSnapshot(
    val tracks: List<PlaybackTrack>,
    val index: Int,
    val positionMs: Long,
    val playing: Boolean,
)

fun TransferSnapshot.toJson() =
    buildJsonObject {
        put("queue", JsonArray(tracks.map { it.toTransferJson() }))
        put("index", index)
        put("positionMs", positionMs)
        put("playing", playing)
    }

// Tracks this phone cannot play are dropped; null when the current one is among them.
fun JsonObject.toTransferSnapshot(): TransferSnapshot? {
    val queue = runCatching { getValue("queue").jsonArray }.getOrNull() ?: return null
    val index = this["index"]?.jsonPrimitive?.intOrNull ?: return null
    val positionMs = this["positionMs"]?.jsonPrimitive?.doubleOrNull?.toLong() ?: return null
    val playing = this["playing"]?.jsonPrimitive?.booleanOrNull ?: return null
    val tracks = mutableListOf<PlaybackTrack>()
    var current: Int? = null
    queue.forEachIndexed { i, element ->
        val track = runCatching { element.jsonObject.toTransferTrack() }.getOrNull() ?: return@forEachIndexed
        if (i == index) current = tracks.size
        tracks += track
    }
    return current?.let { TransferSnapshot(tracks, it, positionMs.coerceAtLeast(0), playing) }
}

private fun PlaybackTrack.toTransferJson() =
    buildJsonObject {
        put("trackId", trackId.toString())
        put("albumId", albumId.toString())
        albumDiscId?.let { put("albumDiscId", it.toString()) }
        put("albumTitle", albumTitle)
        put("title", title)
        put("languageId", languageId)
        put("albumLanguageId", albumLanguageId)
        put("contentType", contentType)
        put("versionType", versionType)
        put(
            "party",
            buildJsonArray {
                artists.forEach {
                    add(
                        buildJsonObject {
                            put("partyId", it.partyId.toString())
                            put("name", it.name)
                        },
                    )
                }
            },
        )
        put("albumCoverUrl", coverUrl.orEmpty())
        put("audio", audio)
        put("durationInMs", durationMs)
    }

private fun JsonObject.toTransferTrack(): PlaybackTrack? {
    fun string(key: String) = (this[key] as? JsonPrimitive)?.contentOrNull
    val audio = this["audio"] as? JsonObject ?: return null
    val (original, opus96) = audio.toAudioFiles() ?: return null
    return PlaybackTrack(
        albumId = string("albumId")?.toLongOrNull() ?: return null,
        albumDiscId = string("albumDiscId")?.toLongOrNull(),
        trackId = string("trackId")?.toLongOrNull() ?: return null,
        title = string("title") ?: return null,
        artists =
            (this["party"] as? JsonArray).orEmpty().mapNotNull { party ->
                val item = party as? JsonObject ?: return@mapNotNull null
                val partyId = (item["partyId"] as? JsonPrimitive)?.contentOrNull?.toLongOrNull()
                val name = (item["name"] as? JsonPrimitive)?.contentOrNull
                if (partyId != null && name != null) TrackArtist(partyId, name) else null
            },
        albumTitle = string("albumTitle").orEmpty(),
        coverUrl = string("albumCoverUrl")?.ifEmpty { null },
        durationMs = string("durationInMs")?.toDoubleOrNull()?.toLong() ?: 0,
        contentType = string("contentType") ?: "Music",
        versionType = string("versionType") ?: "Original",
        original = original,
        opus96 = opus96,
        audio = audio,
        languageId = string("languageId")?.toLongOrNull(),
        albumLanguageId = string("albumLanguageId")?.toLongOrNull(),
    )
}
