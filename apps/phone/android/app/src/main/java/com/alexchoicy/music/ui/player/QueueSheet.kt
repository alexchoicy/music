package com.alexchoicy.music.ui.player

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Velocity
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import com.alexchoicy.music.R
import com.alexchoicy.music.playback.MusicPlayer
import com.alexchoicy.music.playback.PlayerStatus
import com.alexchoicy.music.playback.QueueEntry
import com.alexchoicy.music.ui.components.Artwork
import com.alexchoicy.music.ui.components.ConfirmDialog
import com.alexchoicy.music.ui.components.MusicBottomSheet
import com.alexchoicy.music.ui.formatDurationHoursMinutes
import com.alexchoicy.music.ui.formatPlaybackTime
import com.alexchoicy.music.ui.plural
import com.alexchoicy.music.ui.theme.MusicTheme
import com.alexchoicy.music.ui.theme.TabularNumbers
import com.alexchoicy.music.ui.theme.UNAVAILABLE_ALPHA

@Composable
fun QueueSheet(
    player: MusicPlayer,
    onDismiss: () -> Unit,
    onCleared: () -> Unit,
) {
    var confirmClear by remember { mutableStateOf(false) }
    var clearRequested by remember { mutableStateOf<(() -> Unit)?>(null) }

    MusicBottomSheet(
        title = "Queue",
        onDismiss = onDismiss,
        scrollable = false,
        action = { hide ->
            if (player.queue.isNotEmpty()) {
                TextButton(
                    onClick = {
                        clearRequested = hide
                        confirmClear = true
                    },
                ) {
                    Text("Clear", style = MaterialTheme.typography.labelLarge, color = MusicTheme.colors.foreground)
                }
            }
        },
    ) { hide -> QueueList(player, onPlayed = hide) }

    if (confirmClear) {
        ConfirmDialog(
            title = "Clear queue?",
            message = "This stops playback and removes all tracks.",
            confirmLabel = "Clear",
            onConfirm = {
                clearRequested?.invoke()
                onCleared()
                player.clearQueue()
            },
            onDismiss = { confirmClear = false },
        )
    }
}

// Keeps scrolling and flings in the list, so only dragging the sheet's handle closes it.
private val KeepScroll =
    object : NestedScrollConnection {
        override fun onPostScroll(
            consumed: Offset,
            available: Offset,
            source: NestedScrollSource,
        ) = available

        override suspend fun onPostFling(
            consumed: Velocity,
            available: Velocity,
        ) = available
    }

private class DragState(
    val entryId: String,
) {
    var offset by mutableFloatStateOf(0f)
}

@Composable
private fun QueueList(
    player: MusicPlayer,
    onPlayed: () -> Unit,
) {
    val current = player.current ?: return
    val previous = player.previous
    val upcoming = player.upcoming
    val upcomingDuration = upcoming.sumOf { it.track.durationMs }
    val listState =
        rememberLazyListState(
            initialFirstVisibleItemIndex = if (previous.isEmpty()) 0 else previous.size + 1,
        )
    var drag by remember { mutableStateOf<DragState?>(null) }

    LazyColumn(state = listState, modifier = Modifier.fillMaxWidth().nestedScroll(KeepScroll)) {
        if (previous.isNotEmpty()) {
            item("previous") { SectionHeader("Previous") }
            itemsIndexed(previous, key = { _, entry -> "previous-${entry.entryId}" }) { _, entry ->
                QueueRow(
                    player = player,
                    entry = entry,
                    onPlay = { player.playEntry(entry.entryId) },
                    onRemove = { player.removeEntry(entry.entryId) },
                )
            }
        }
        item("now") { SectionHeader("Now playing") }
        item("current") {
            QueueRow(
                player = player,
                entry = current,
                current = true,
                canStop = true,
                onPlay = { if (player.status != PlayerStatus.Playing) player.play() },
                onRemove = { player.removeEntry(current.entryId) },
            )
        }
        item("next") {
            SectionHeader(
                title = "Next up",
                detail =
                    if (upcoming.isEmpty()) {
                        null
                    } else {
                        listOfNotNull(plural(upcoming.size, "track"), formatDurationHoursMinutes(upcomingDuration))
                            .joinToString(" · ")
                    },
            )
        }
        if (upcoming.isEmpty()) {
            item("empty") {
                Text(
                    text = "Nothing up next.",
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MusicTheme.colors.mutedForeground,
                )
            }
        }
        itemsIndexed(upcoming, key = { _, entry -> entry.entryId }) { position, entry ->
            val dragged = drag?.entryId == entry.entryId
            QueueRow(
                player = player,
                entry = entry,
                skipped = !player.isAutoPlayable(entry),
                canStop = player.isAutoPlayable(entry),
                modifier =
                    if (dragged) {
                        Modifier
                            .zIndex(1f)
                            .graphicsLayer { translationY = drag?.offset ?: 0f }
                    } else {
                        Modifier.animateItem()
                    },
                onPlay = {
                    player.playEntry(entry.entryId)
                    onPlayed()
                },
                onRemove = { player.removeEntry(entry.entryId) },
                dragHandle =
                    Modifier.pointerInput(entry.entryId) {
                        detectDragGestures(
                            onDragStart = { drag = DragState(entry.entryId) },
                            onDragEnd = { drag = null },
                            onDragCancel = { drag = null },
                        ) { change, amount ->
                            change.consume()
                            val active = drag ?: return@detectDragGestures
                            active.offset += amount.y
                            moveDragged(player, listState, active)
                        }
                    },
            )
            if (position == upcoming.lastIndex) Box(Modifier.heightIn(min = 8.dp))
        }
    }
}

private fun moveDragged(
    player: MusicPlayer,
    listState: LazyListState,
    drag: DragState,
) {
    val upcoming = player.upcoming.map { it.entryId }
    val items = listState.layoutInfo.visibleItemsInfo
    val dragged = items.firstOrNull { it.key == drag.entryId } ?: return
    val center = dragged.offset + drag.offset + dragged.size / 2f
    val target =
        items.firstOrNull {
            it.key != drag.entryId && it.key in upcoming && center >= it.offset && center <= it.offset + it.size
        } ?: return
    val from = upcoming.indexOf(drag.entryId)
    val to = upcoming.indexOf(target.key)
    if (from < 0 || to < 0) return
    player.moveUpcoming(from, to)
    drag.offset -= target.offset - dragged.offset
}

@Composable
private fun SectionHeader(
    title: String,
    detail: String? = null,
) {
    val colors = MusicTheme.colors
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(start = 24.dp, end = 24.dp, top = 16.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.labelSmall,
            color = colors.mutedForeground,
        )
        if (detail != null) {
            Text(
                text = detail,
                style = MaterialTheme.typography.labelSmall,
                color = colors.mutedForeground,
            )
        }
    }
}

@Composable
private fun QueueRow(
    player: MusicPlayer,
    entry: QueueEntry,
    onPlay: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
    current: Boolean = false,
    skipped: Boolean = false,
    // Unset where a stop can't go, e.g. tracks already played or skipped.
    canStop: Boolean = false,
    dragHandle: Modifier? = null,
) {
    val colors = MusicTheme.colors
    val available = player.isAvailable(entry)
    val track = entry.track
    val stopped = player.stopAfterId == entry.entryId
    Column(modifier.background(colors.popover)) {
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .heightIn(min = 64.dp)
                    .padding(end = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Rows without a handle keep its space, so artwork lines up.
            Box(
                modifier =
                    Modifier
                        .size(48.dp)
                        .then(dragHandle ?: Modifier),
                contentAlignment = Alignment.Center,
            ) {
                if (dragHandle != null) {
                    Icon(
                        painterResource(R.drawable.ic_grip_vertical),
                        contentDescription = "Reorder ${track.title}",
                        modifier = Modifier.size(20.dp),
                        tint = colors.mutedForeground,
                    )
                }
            }
            Row(
                modifier =
                    Modifier
                        .weight(1f)
                        .clip(MaterialTheme.shapes.medium)
                        .clickable(enabled = available, onClick = onPlay)
                        .alpha(if (available) 1f else UNAVAILABLE_ALPHA)
                        .padding(end = 12.dp, top = 8.dp, bottom = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Artwork(
                    url = track.coverUrl,
                    shape = MaterialTheme.shapes.small,
                    placeholderIcon = R.drawable.ic_albums,
                    placeholderIconSize = 20.dp,
                    modifier = Modifier.size(40.dp),
                )
                Column(Modifier.weight(1f)) {
                    Text(
                        text = track.title,
                        style = MaterialTheme.typography.titleSmall,
                        color = if (current) colors.primary else colors.foreground,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text =
                            listOfNotNull(
                                track.artistNames ?: "Unknown artist",
                                formatPlaybackTime(track.durationMs),
                                when {
                                    !available -> "Not downloaded"
                                    skipped -> "Skipped"
                                    entry.radio -> "Radio"
                                    else -> null
                                },
                            ).joinToString(" · "),
                        style = MaterialTheme.typography.bodySmall.merge(TabularNumbers),
                        color = colors.mutedForeground,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            IconButton(onClick = onRemove) {
                Icon(
                    painterResource(R.drawable.ic_close),
                    contentDescription = "Remove ${track.title} from queue",
                    modifier = Modifier.size(18.dp),
                    tint = colors.mutedForeground,
                )
            }
            if (canStop || stopped) {
                IconButton(
                    onClick = { player.toggleStopAfter(entry.entryId) },
                    colors =
                        IconButtonDefaults.iconButtonColors(
                            containerColor = if (stopped) colors.primary.copy(alpha = 0.12f) else Color.Transparent,
                        ),
                ) {
                    Icon(
                        painterResource(R.drawable.ic_circle_pause),
                        contentDescription =
                            if (stopped) {
                                "Stops after ${track.title}. Remove stop"
                            } else {
                                "Stop after ${track.title}"
                            },
                        modifier = Modifier.size(20.dp),
                        tint = if (stopped) colors.primary else colors.mutedForeground,
                    )
                }
            } else {
                Spacer(Modifier.size(48.dp))
            }
        }
        if (stopped) StopLine()
    }
}

@Composable
private fun StopLine() {
    val color = MusicTheme.colors.primary
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        DashedLine(color.copy(alpha = 0.4f), Modifier.weight(1f))
        Text(
            text = "Pauses here",
            style = MaterialTheme.typography.labelSmall,
            color = color,
        )
        DashedLine(color.copy(alpha = 0.4f), Modifier.weight(1f))
    }
}

@Composable
private fun DashedLine(
    color: Color,
    modifier: Modifier,
) {
    Box(
        modifier
            .height(2.dp)
            .drawBehind {
                drawLine(
                    color = color,
                    start = Offset(0f, size.height / 2),
                    end = Offset(size.width, size.height / 2),
                    strokeWidth = size.height,
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(6.dp.toPx(), 4.dp.toPx())),
                )
            },
    )
}
