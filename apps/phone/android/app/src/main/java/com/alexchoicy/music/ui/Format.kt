package com.alexchoicy.music.ui

import android.text.format.DateUtils
import java.text.NumberFormat
import java.time.Instant
import kotlin.math.roundToInt
import kotlin.math.roundToLong

fun plural(count: Int, noun: String) = "$count $noun${if (count == 1) "" else "s"}"

fun formatCount(count: Long): String = NumberFormat.getIntegerInstance().format(count)

fun formatDurationHoursMinutes(durationMs: Long): String? {
    if (durationMs <= 0) return null
    val totalMinutes = (durationMs / 60_000.0).roundToLong()
    val hours = totalMinutes / 60
    val minutes = totalMinutes % 60
    return when {
        hours == 0L -> "${minutes}m"
        minutes == 0L -> "${hours}h"
        else -> "${hours}h ${minutes}m"
    }
}

fun formatPlaybackTime(ms: Long): String {
    val totalSeconds = (ms.coerceAtLeast(0) / 1000.0).roundToInt()
    val hours = totalSeconds / 3600
    val minutes = totalSeconds % 3600 / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        "%d:%02d:%02d".format(hours, minutes, seconds)
    } else {
        "%02d:%02d".format(minutes, seconds)
    }
}

fun formatRelativeTime(instant: Instant): String {
    val millis = instant.toEpochMilli()
    val now = System.currentTimeMillis()
    if (now - millis < DateUtils.MINUTE_IN_MILLIS) return "Just now"
    return DateUtils.getRelativeTimeSpanString(millis, now, DateUtils.MINUTE_IN_MILLIS).toString()
}
