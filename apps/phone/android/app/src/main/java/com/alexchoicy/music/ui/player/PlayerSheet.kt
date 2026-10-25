package com.alexchoicy.music.ui.player

import android.content.ComponentName
import androidx.activity.compose.PredictiveBackHandler
import androidx.annotation.DrawableRes
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animate
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.MutatorMutex
import androidx.compose.foundation.background
import androidx.compose.foundation.basicMarquee
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.layout
import androidx.compose.ui.layout.onPlaced
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.lerp
import androidx.compose.ui.util.lerp
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import coil3.compose.AsyncImage
import com.alexchoicy.music.MusicApplication
import com.alexchoicy.music.R
import com.alexchoicy.music.playback.MusicPlayer
import com.alexchoicy.music.playback.PlaybackService
import com.alexchoicy.music.playback.PlayerStatus
import com.alexchoicy.music.playback.QueueEntry
import com.alexchoicy.music.playback.RepeatMode
import com.alexchoicy.music.ui.components.Artwork
import com.alexchoicy.music.ui.formatPlaybackTime
import com.alexchoicy.music.ui.rememberAlbumSharer
import com.alexchoicy.music.ui.theme.MusicTheme
import com.alexchoicy.music.ui.theme.TabularNumbers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt
import kotlin.time.Duration.Companion.milliseconds

private val MiniHeight = 64.dp
private val MiniInset = 8.dp
private val MiniArtSize = 48.dp
private val MiniCorner = 12.dp
private val MiniArtCorner = 6.dp
private val FullArtCorner = 12.dp
private val PlayerInset = 24.dp
private const val POSITION_TICK_MS = 250L
private const val MINI_FADE_END = 0.2f
private const val FULL_FADE_START = 0.1f
private const val FULL_FADE_END = 0.6f
private const val FLING_VELOCITY = 1.5f
private const val PREDICTIVE_BACK_TRAVEL = 0.3f

val MiniPlayerSpace = MiniHeight + MiniInset

val LocalPlayer = staticCompositionLocalOf<MusicPlayer> { error("No MusicPlayer provided") }

@Composable
fun ProvidePlayer(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val app = context.applicationContext as MusicApplication
    // A connected controller keeps the playback service, and its notification, running.
    DisposableEffect(context) {
        val token = SessionToken(context, ComponentName(context, PlaybackService::class.java))
        val future = MediaController.Builder(context, token).buildAsync()
        onDispose { MediaController.releaseFuture(future) }
    }
    LaunchedEffect(app) { app.devices.start() }
    CompositionLocalProvider(LocalPlayer provides app.player, content = content)
}

@Stable
class PlayerSheetState(
    expanded: Boolean,
) {
    var progress by mutableFloatStateOf(if (expanded) 1f else 0f)
        private set
    var expanded by mutableStateOf(expanded)
        private set
    private val mutex = MutatorMutex()

    suspend fun expand(velocity: Float = 0f) = settleTo(true, velocity)

    suspend fun collapse(velocity: Float = 0f) = settleTo(false, velocity)

    internal suspend fun stop() = mutex.mutate {}

    internal fun drag(delta: Float) {
        progress = (progress + delta).coerceIn(0f, 1f)
    }

    internal suspend fun hide() =
        mutex.mutate {
            expanded = false
            progress = 0f
        }

    internal suspend fun settle(velocity: Float) =
        when {
            velocity > FLING_VELOCITY -> expand(velocity)
            velocity < -FLING_VELOCITY -> collapse(velocity)
            else -> settleTo(progress > 0.5f, velocity)
        }

    private suspend fun settleTo(
        expanded: Boolean,
        velocity: Float,
    ) = mutex.mutate {
        this.expanded = expanded
        animate(
            initialValue = progress,
            targetValue = if (expanded) 1f else 0f,
            initialVelocity = velocity,
            animationSpec = spring(dampingRatio = 1f, stiffness = 400f),
        ) { value, _ -> progress = value.coerceIn(0f, 1f) }
    }

    companion object {
        val Saver = Saver({ it.expanded }, ::PlayerSheetState)
    }
}

@Composable
fun rememberPlayerSheetState() = rememberSaveable(saver = PlayerSheetState.Saver) { PlayerSheetState(false) }

@Composable
fun PlayerSheet(
    player: MusicPlayer,
    sheet: PlayerSheetState,
    bottomBarHeight: Dp,
    onOpenAlbum: (Long) -> Unit,
    modifier: Modifier = Modifier,
) {
    var lastEntry by remember { mutableStateOf(player.current) }
    player.current?.let { lastEntry = it }
    var positionMs by remember { mutableLongStateOf(player.positionMs) }

    LaunchedEffect(player.current == null) {
        if (player.current == null) sheet.hide()
    }
    LaunchedEffect(player.status, player.current?.entryId, player.positionJumps) {
        do {
            positionMs = player.positionMs
            delay(POSITION_TICK_MS.milliseconds)
        } while (player.status == PlayerStatus.Playing)
    }

    AnimatedVisibility(
        visible = player.current != null,
        modifier = modifier,
        enter = slideInVertically { it / 8 } + fadeIn(),
        exit = slideOutVertically { it / 8 } + fadeOut(),
    ) {
        lastEntry?.let {
            ExpandingPlayer(
                player = player,
                entry = it,
                positionMs = { positionMs },
                onSeek = { position ->
                    player.seekTo(position)
                    positionMs = position
                },
                sheet = sheet,
                bottomBarHeight = bottomBarHeight,
                onOpenAlbum = onOpenAlbum,
            )
        }
    }
}

@Composable
private fun ExpandingPlayer(
    player: MusicPlayer,
    entry: QueueEntry,
    positionMs: () -> Long,
    onSeek: (Long) -> Unit,
    sheet: PlayerSheetState,
    bottomBarHeight: Dp,
    onOpenAlbum: (Long) -> Unit,
) {
    val colors = MusicTheme.colors
    val density = LocalDensity.current
    val scope = rememberCoroutineScope()
    var openSheet by remember { mutableStateOf<PlayerSheetContent?>(null) }
    var artSlot by remember { mutableStateOf<Rect?>(null) }
    val miniVisible by remember { derivedStateOf { sheet.progress < MINI_FADE_END } }
    val fullVisible by remember { derivedStateOf { sheet.progress > FULL_FADE_START } }
    val progress = { sheet.progress }

    PredictiveBackHandler(enabled = sheet.expanded) { events ->
        try {
            sheet.stop()
            events.collect { sheet.drag(1f - it.progress * PREDICTIVE_BACK_TRAVEL - sheet.progress) }
            scope.launch { sheet.collapse() }
        } catch (e: CancellationException) {
            scope.launch { sheet.expand() }
            throw e
        }
    }

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val width = constraints.maxWidth
        val height = constraints.maxHeight
        val miniHeight = with(density) { MiniHeight.roundToPx() }
        val insetPx = with(density) { MiniInset.toPx() }
        val collapsedTop =
            height - with(density) { bottomBarHeight.roundToPx() } - miniHeight -
                insetPx.roundToInt()
        val dragRange = collapsedTop.coerceAtLeast(1).toFloat()
        val dragState =
            rememberDraggableState { delta ->
                sheet.drag(-delta / dragRange)
            }

        Box(
            Modifier
                .layout { measurable, _ ->
                    val fraction = progress()
                    val inset = lerp(insetPx, 0f, fraction).roundToInt()
                    val placeable =
                        measurable.measure(
                            Constraints.fixed(
                                width - inset * 2,
                                lerp(miniHeight, height, fraction),
                            ),
                        )
                    layout(width, height) {
                        placeable.place(inset, lerp(collapsedTop, 0, fraction))
                    }
                }.graphicsLayer {
                    val fraction = progress()
                    shape = RoundedCornerShape(lerp(MiniCorner, 0.dp, fraction))
                    clip = true
                    shadowElevation = lerp(8.dp.toPx(), 0f, fraction)
                }.drawBehind { drawRect(lerp(colors.popover, colors.background, progress())) }
                .draggable(
                    state = dragState,
                    orientation = Orientation.Vertical,
                    onDragStarted = { sheet.stop() },
                    onDragStopped = { velocity ->
                        scope.launch { sheet.settle(-velocity / dragRange) }
                    },
                ),
        ) {
            FullPlayer(
                player = player,
                entry = entry,
                positionMs = positionMs,
                onSeek = onSeek,
                onCollapse = { scope.launch { sheet.collapse() } },
                onOpenAlbum = {
                    onOpenAlbum(entry.track.albumId)
                    scope.launch { sheet.collapse() }
                },
                onOpenSheet = { openSheet = it },
                onArtSlot = { artSlot = it },
                interactive = fullVisible,
                modifier =
                    Modifier
                        .layout { measurable, constraints ->
                            val placeable = measurable.measure(Constraints.fixed(width, height))
                            layout(constraints.maxWidth, constraints.maxHeight) {
                                placeable.place(-lerp(insetPx, 0f, progress()).roundToInt(), 0)
                            }
                        }.graphicsLayer {
                            alpha =
                                ((progress() - FULL_FADE_START) / (FULL_FADE_END - FULL_FADE_START))
                                    .coerceIn(0f, 1f)
                        },
            )
            if (miniVisible) {
                MiniPlayer(
                    player = player,
                    entry = entry,
                    positionMs = positionMs,
                    progress = progress,
                    onExpand = { scope.launch { sheet.expand() } },
                )
            }
            SharedArtwork(
                url = entry.track.coverUrl,
                progress = progress,
                fullSlot = artSlot,
                insetPx = insetPx,
            )
        }
    }

    when (openSheet) {
        PlayerSheetContent.Queue ->
            QueueSheet(
                player = player,
                onDismiss = { openSheet = null },
                onCleared = { scope.launch { sheet.collapse() } },
            )

        PlayerSheetContent.Options ->
            PlaybackOptionsSheet(
                player = player,
                onDismiss = { openSheet = null },
            )

        PlayerSheetContent.Devices -> DevicesSheet(onDismiss = { openSheet = null })
        null -> Unit
    }
}

private enum class PlayerSheetContent { Queue, Options, Devices }

@Composable
private fun SharedArtwork(
    url: String?,
    progress: () -> Float,
    fullSlot: Rect?,
    insetPx: Float,
) {
    val density = LocalDensity.current
    val mini =
        with(density) {
            val size = MiniArtSize.toPx()
            val offset = (MiniHeight.toPx() - size) / 2
            Rect(Offset(offset, offset), Size(size, size))
        }
    Box(
        Modifier
            .layout { measurable, constraints ->
                val fraction = progress()
                val full = fullSlot?.translate(-lerp(insetPx, 0f, fraction), 0f) ?: mini
                val size = lerp(mini.width, full.width, fraction).roundToInt()
                val placeable = measurable.measure(Constraints.fixed(size, size))
                layout(constraints.maxWidth, constraints.maxHeight) {
                    placeable.place(
                        lerp(mini.left, full.left, fraction).roundToInt(),
                        lerp(mini.top, full.top, fraction).roundToInt(),
                    )
                }
            }.graphicsLayer {
                shape = RoundedCornerShape(lerp(MiniArtCorner, FullArtCorner, progress()))
                clip = true
                shadowElevation = 2.dp.toPx()
            },
    ) {
        Artwork(
            url = url,
            shape = RectangleShape,
            originalSize = true,
            placeholderIcon = R.drawable.ic_albums,
            placeholderIconSize = 24.dp,
            modifier = Modifier.fillMaxSize(),
        )
    }
}

@Composable
private fun MiniPlayer(
    player: MusicPlayer,
    entry: QueueEntry,
    positionMs: () -> Long,
    progress: () -> Float,
    onExpand: () -> Unit,
) {
    val colors = MusicTheme.colors
    val hasNext = player.hasNext
    Box(
        Modifier
            .fillMaxWidth()
            .height(MiniHeight)
            .graphicsLayer { alpha = 1f - (progress() / MINI_FADE_END).coerceIn(0f, 1f) }
            .clickable(onClickLabel = "Open player", onClick = onExpand),
    ) {
        Row(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(start = (MiniHeight - MiniArtSize) / 2 + MiniArtSize + 12.dp, end = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = entry.track.title,
                    style = MaterialTheme.typography.titleSmall,
                    color = colors.foreground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = entry.track.artistNames ?: "Unknown artist",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.mutedForeground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            IconButton(onClick = player::togglePlayback) {
                Box(
                    Modifier
                        .size(40.dp)
                        .background(colors.primary, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    PlayPauseIcon(player, Modifier.size(20.dp), colors.primaryForeground)
                }
            }
            IconButton(onClick = player::skipNext, enabled = hasNext) {
                Icon(
                    painterResource(R.drawable.ic_skip_next),
                    contentDescription = "Next",
                    modifier =
                        Modifier
                            .size(24.dp)
                            .alpha(if (hasNext) 1f else 0.35f),
                    tint = colors.foreground,
                )
            }
        }
        Box(
            Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 12.dp)
                .fillMaxWidth()
                .height(2.dp)
                .drawBehind {
                    val duration = player.durationMs
                    val fraction =
                        if (duration > 0) {
                            (positionMs().toFloat() / duration).coerceIn(0f, 1f)
                        } else {
                            0f
                        }
                    drawRect(colors.primary, size = size.copy(width = size.width * fraction))
                },
        )
    }
}

@Composable
private fun PlayPauseIcon(
    player: MusicPlayer,
    modifier: Modifier,
    tint: Color,
) {
    val playing = player.status == PlayerStatus.Playing
    if (player.loading) {
        CircularProgressIndicator(modifier = modifier, color = tint, strokeWidth = 2.dp)
    } else {
        Icon(
            painterResource(if (playing) R.drawable.ic_pause else R.drawable.ic_play),
            contentDescription = if (playing) "Pause" else "Play",
            modifier = modifier,
            tint = tint,
        )
    }
}

@Composable
private fun FullPlayer(
    player: MusicPlayer,
    entry: QueueEntry,
    positionMs: () -> Long,
    onSeek: (Long) -> Unit,
    onCollapse: () -> Unit,
    onOpenAlbum: () -> Unit,
    onOpenSheet: (PlayerSheetContent) -> Unit,
    onArtSlot: (Rect) -> Unit,
    interactive: Boolean,
    modifier: Modifier,
) {
    val colors = MusicTheme.colors
    var root by remember { mutableStateOf<LayoutCoordinates?>(null) }

    Box(modifier.onPlaced { root = it }) {
        AsyncImage(
            model = entry.track.coverUrl,
            contentDescription = null,
            modifier =
                Modifier
                    .fillMaxSize()
                    .blur(64.dp),
            contentScale = ContentScale.Crop,
            alpha = 0.5f,
        )
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        0f to colors.background.copy(alpha = 0.2f),
                        0.6f to colors.artFade,
                        1f to colors.background,
                    ),
                ),
        )
        Column(
            Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.systemBars)
                .padding(horizontal = PlayerInset),
        ) {
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onCollapse, modifier = Modifier.offset(x = (-12).dp)) {
                    Icon(
                        painterResource(R.drawable.ic_chevron_down),
                        contentDescription = "Close player",
                        modifier = Modifier.size(24.dp),
                        tint = colors.foreground,
                    )
                }
                Column(
                    modifier =
                        Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .clickable(onClickLabel = "Open album", onClick = onOpenAlbum)
                            .padding(vertical = 4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = "PLAYING FROM",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 0.06.em,
                        color = colors.mutedForeground,
                        maxLines = 1,
                    )
                    Text(
                        text = entry.track.albumTitle,
                        style = MaterialTheme.typography.labelMedium,
                        color = colors.foreground,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(Modifier.width(36.dp))
            }
            val artSlot =
                Modifier.onPlaced { slot ->
                    root?.let { onArtSlot(it.localBoundingBoxOf(slot, clipBounds = false)) }
                }
            ArtSlot(
                Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 24.dp),
                artSlot,
            )
            PlayerDetails(player, entry, positionMs, onSeek, onOpenSheet)
            Spacer(Modifier.height(24.dp))
        }
        if (!interactive) {
            // Takes taps away from the hidden controls; the sheet's drag still receives them.
            Box(
                Modifier
                    .matchParentSize()
                    .pointerInput(Unit) { awaitPointerEventScope { while (true) awaitPointerEvent() } },
            )
        }
    }
}

@Composable
private fun ArtSlot(
    modifier: Modifier,
    slotModifier: Modifier,
) {
    Box(modifier, contentAlignment = Alignment.Center) {
        Box(
            Modifier
                .aspectRatio(1f, matchHeightConstraintsFirst = true)
                .then(slotModifier),
        )
    }
}

@Composable
private fun ColumnScope.PlayerDetails(
    player: MusicPlayer,
    entry: QueueEntry,
    positionMs: () -> Long,
    onSeek: (Long) -> Unit,
    onOpenSheet: (PlayerSheetContent) -> Unit,
) {
    val colors = MusicTheme.colors
    val source = player.source
    val error = player.error
    Text(
        text = entry.track.title,
        modifier = Modifier.basicMarquee(),
        style = MaterialTheme.typography.headlineMedium,
        fontWeight = FontWeight.Bold,
        color = colors.foreground,
        maxLines = 1,
    )
    Text(
        text = entry.track.artistNames ?: "Unknown artist",
        modifier = Modifier.padding(top = 4.dp),
        style = MaterialTheme.typography.bodyLarge,
        color = colors.foreground,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
    )
    SeekBar(player, positionMs(), onSeek, Modifier.padding(top = 24.dp))
    val status =
        when {
            error != null -> error
            source != null ->
                listOfNotNull(
                    entry.track.qualityLabel(source.file),
                    "Downloaded".takeIf { source.local },
                ).joinToString(" · ")

            else -> null
        }
    if (status != null) {
        Text(
            text = status,
            modifier = Modifier.align(Alignment.CenterHorizontally),
            style = MaterialTheme.typography.bodySmall,
            color = if (error != null) colors.destructiveForeground else colors.mutedForeground,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
    TransportControls(
        player = player,
        modifier = Modifier.padding(vertical = 24.dp),
    )
    BottomActions(player, entry, onOpenSheet)
}

@Composable
private fun BottomActions(
    player: MusicPlayer,
    entry: QueueEntry,
    onOpenSheet: (PlayerSheetContent) -> Unit,
) {
    val sharer = rememberAlbumSharer()
    val settings = player.settings
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ToggleButton(
            icon = R.drawable.ic_radio,
            label = "Radio, plays similar music when the queue ends",
            active = settings.radio,
            onClick = { settings.updateRadio(!settings.radio) },
        )
        ActionButton(R.drawable.ic_share, "Share track") {
            val track = entry.track
            sharer.share(track.albumId, "${track.title} from ${track.albumTitle}", track.trackId)
        }
        ActionButton(
            R.drawable.ic_monitor_speaker,
            "Devices",
        ) { onOpenSheet(PlayerSheetContent.Devices) }
        ActionButton(
            R.drawable.ic_sliders,
            "Playback options",
        ) { onOpenSheet(PlayerSheetContent.Options) }
        ActionButton(R.drawable.ic_queue, "Queue") { onOpenSheet(PlayerSheetContent.Queue) }
    }
}

@Composable
private fun ActionButton(
    @DrawableRes icon: Int,
    label: String,
    onClick: () -> Unit,
) {
    IconButton(onClick = onClick) {
        Icon(
            painterResource(icon),
            contentDescription = label,
            modifier = Modifier.size(22.dp),
            tint = MusicTheme.colors.foreground,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SeekBar(
    player: MusicPlayer,
    positionMs: Long,
    onSeek: (Long) -> Unit,
    modifier: Modifier,
) {
    val colors = MusicTheme.colors
    var seeking by remember { mutableStateOf<Float?>(null) }
    val duration = player.durationMs
    val fraction =
        seeking
            ?: if (duration > 0) (positionMs.toFloat() / duration).coerceIn(0f, 1f) else 0f
    val position = (fraction * duration).toLong()
    val sliderColors =
        SliderDefaults.colors(
            thumbColor = colors.primary,
            activeTrackColor = colors.primary,
            inactiveTrackColor = colors.secondary,
        )

    Column(modifier) {
        Slider(
            value = fraction,
            onValueChange = { seeking = it },
            onValueChangeFinished = {
                seeking?.let { onSeek((it * duration).toLong()) }
                seeking = null
            },
            enabled = duration > 0 && player.source != null,
            colors = sliderColors,
            thumb = {
                Box(
                    Modifier
                        .size(14.dp)
                        .background(colors.primary, CircleShape),
                )
            },
            track = {
                SliderDefaults.Track(
                    sliderState = it,
                    colors = sliderColors,
                    modifier = Modifier.height(3.dp),
                    thumbTrackGapSize = 0.dp,
                    drawStopIndicator = null,
                )
            },
        )
        Row(Modifier.fillMaxWidth()) {
            Text(
                text = formatPlaybackTime(position),
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.bodySmall.merge(TabularNumbers),
                color = colors.mutedForeground,
            )
            Text(
                text = "-${formatPlaybackTime(duration - position)}",
                style = MaterialTheme.typography.bodySmall.merge(TabularNumbers),
                color = colors.mutedForeground,
            )
        }
    }
}

@Composable
private fun TransportControls(
    player: MusicPlayer,
    modifier: Modifier,
) {
    val colors = MusicTheme.colors
    val repeatMode = player.repeatMode
    val hasQueue = player.current != null
    val playInteraction = remember { MutableInteractionSource() }
    val pressed by playInteraction.collectIsPressedAsState()
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ToggleButton(
            icon = R.drawable.ic_shuffle,
            label = if (player.shuffle) "Shuffle on" else "Shuffle off",
            active = player.shuffle,
            onClick = player::toggleShuffle,
        )
        TransportButton(
            R.drawable.ic_skip_previous,
            "Previous",
            enabled = hasQueue,
            onClick = player::skipPrevious,
        )
        Box(
            modifier =
                Modifier
                    .size(80.dp)
                    .graphicsLayer {
                        val scale = if (pressed) 0.95f else 1f
                        scaleX = scale
                        scaleY = scale
                    }.clip(CircleShape)
                    .background(colors.primary.copy(alpha = if (hasQueue) 1f else 0.4f))
                    .clickable(
                        interactionSource = playInteraction,
                        indication = ripple(),
                        enabled = hasQueue,
                        onClick = player::togglePlayback,
                    ),
            contentAlignment = Alignment.Center,
        ) {
            PlayPauseIcon(player, Modifier.size(40.dp), colors.primaryForeground)
        }
        TransportButton(
            R.drawable.ic_skip_next,
            "Next",
            enabled = player.hasNext,
            onClick = player::skipNext,
        )
        ToggleButton(
            icon = if (repeatMode == RepeatMode.One) R.drawable.ic_repeat_one else R.drawable.ic_repeat,
            label =
                when (repeatMode) {
                    RepeatMode.All -> "Repeat queue"
                    RepeatMode.One -> "Repeat track"
                    RepeatMode.Off -> "Repeat off"
                },
            active = repeatMode != RepeatMode.Off,
            onClick = player::cycleRepeatMode,
        )
    }
}

@Composable
private fun TransportButton(
    @DrawableRes icon: Int,
    label: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    IconButton(onClick = onClick, enabled = enabled, modifier = Modifier.size(56.dp)) {
        Icon(
            painterResource(icon),
            contentDescription = label,
            modifier =
                Modifier
                    .size(34.dp)
                    .alpha(if (enabled) 1f else 0.35f),
            tint = MusicTheme.colors.foreground,
        )
    }
}

@Composable
private fun ToggleButton(
    @DrawableRes icon: Int,
    label: String,
    active: Boolean,
    onClick: () -> Unit,
) {
    val colors = MusicTheme.colors
    IconButton(onClick = onClick, modifier = Modifier.size(48.dp)) {
        Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
            Icon(
                painterResource(icon),
                contentDescription = label,
                modifier = Modifier.size(24.dp),
                tint = if (active) colors.primary else colors.foreground,
            )
            Box(
                Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 4.dp)
                    .size(4.dp)
                    .alpha(if (active) 1f else 0f)
                    .background(colors.primary, CircleShape),
            )
        }
    }
}
