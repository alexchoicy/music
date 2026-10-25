package com.alexchoicy.music.playback

import com.alexchoicy.music.api.PlaybackTrack
import java.util.UUID

enum class RepeatMode { Off, All, One }

data class QueueEntry(
    val entryId: String,
    val track: PlaybackTrack,
    val radio: Boolean = false,
)

fun List<PlaybackTrack>.toQueueEntries() = map { QueueEntry(UUID.randomUUID().toString(), it) }

data class SavedQueue(
    val entries: List<QueueEntry> = emptyList(),
    val currentEntryId: String? = null,
    val repeatMode: RepeatMode = RepeatMode.Off,
    val shuffle: Boolean = false,
    val playOrder: List<String> = emptyList(),
)
