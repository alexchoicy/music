package com.alexchoicy.music.ui.player

import androidx.compose.runtime.Immutable
import com.alexchoicy.music.api.ParsedLyrics

enum class LyricVoice { Main, Other, Group }

@Immutable
data class LyricCue(
    val startMs: Long,
    val endMs: Long,
    val text: String,
    val words: List<CueWord>,
    val background: String?,
    val romanizations: List<String>,
    val translations: List<String>,
    val voice: LyricVoice?,
    val singer: String?,
)

@Immutable
data class CueWord(
    val startMs: Long,
    val text: String,
)

private fun seconds(value: Double) = (value * 1000).toLong()

fun ParsedLyrics.toCues(): List<LyricCue> {
    val singersById = singers.associateBy { it.id }
    val isGroup = { id: String -> singersById[id]?.kind == "Group" }
    val main = lines.map { it.singers }.firstOrNull { it.size == 1 && !isGroup(it[0]) }?.first()
    return lines.map { line ->
        val ids = line.singers
        val names = ids.mapNotNull { singersById[it]?.name }
        LyricCue(
            startMs = seconds(line.start),
            endMs = seconds(line.end),
            text = line.text,
            words = line.words.map { CueWord(seconds(it.start), it.text) },
            background = line.background,
            romanizations = line.romanizations.map { it.text },
            translations = line.translations.map { it.text },
            voice =
                when {
                    ids.isEmpty() -> null
                    ids.size > 1 || ids.any(isGroup) -> LyricVoice.Group
                    ids[0] == main -> LyricVoice.Main
                    else -> LyricVoice.Other
                },
            singer = names.joinToString(" & ").ifEmpty { null },
        )
    }
}

fun <T> List<T>.startedAt(
    positionMs: Long,
    start: (T) -> Long,
): Int {
    var low = 0
    var high = lastIndex
    var found = -1
    while (low <= high) {
        val middle = (low + high) ushr 1
        if (start(this[middle]) <= positionMs) {
            found = middle
            low = middle + 1
        } else {
            high = middle - 1
        }
    }
    return found
}

fun List<LyricCue>.liveAt(positionMs: Long): List<Int> =
    (startedAt(positionMs) { it.startMs } downTo 0)
        .filter { positionMs < this[it].endMs }
        .reversed()
