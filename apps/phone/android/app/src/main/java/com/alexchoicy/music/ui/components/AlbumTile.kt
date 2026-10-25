package com.alexchoicy.music.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.R
import com.alexchoicy.music.api.AlbumSummary
import com.alexchoicy.music.ui.AlbumSharer
import com.alexchoicy.music.ui.currentMusicApplication
import com.alexchoicy.music.ui.formatDurationHoursMinutes
import com.alexchoicy.music.ui.player.LocalPlayer
import com.alexchoicy.music.ui.plural
import com.alexchoicy.music.ui.rememberAlbumSharer
import com.alexchoicy.music.ui.theme.MusicTheme
import com.alexchoicy.music.ui.theme.UNAVAILABLE_ALPHA

private val GreyscalePaint =
    Paint().apply {
        colorFilter = ColorFilter.colorMatrix(ColorMatrix().apply { setToSaturation(0f) })
    }

private fun Modifier.greyscale() =
    drawWithContent {
        drawIntoCanvas { canvas ->
            canvas.saveLayer(Rect(Offset.Zero, size), GreyscalePaint)
            drawContent()
            canvas.restore()
        }
    }

@Composable
fun AlbumTile(
    album: AlbumSummary,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    showMeta: Boolean = true,
) {
    val colors = MusicTheme.colors
    val meta =
        listOfNotNull(
            plural(album.trackCount, "track"),
            formatDurationHoursMinutes(album.totalDurationMs),
        ).joinToString(" · ")

    val interactionSource = remember { MutableInteractionSource() }
    val app = currentMusicApplication()
    val available = app.network.online || album.id in app.downloads.downloadedAlbums
    var showMenu by remember { mutableStateOf(false) }
    val sharer = rememberAlbumSharer()

    Column(
        modifier =
            modifier
                .combinedClickable(
                    interactionSource = interactionSource,
                    indication = null,
                    onLongClickLabel = "More actions",
                    onLongClick = { showMenu = true },
                    onClick = onClick,
                ).alpha(if (available) 1f else UNAVAILABLE_ALPHA),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box {
            Artwork(
                url = album.coverUrl,
                shape = MaterialTheme.shapes.large,
                placeholderIcon = R.drawable.ic_albums,
                interactionSource = interactionSource,
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .aspectRatio(1f)
                        .then(if (available) Modifier else Modifier.greyscale()),
            )
            if (album.type != "Album") {
                Text(
                    text = album.type,
                    modifier =
                        Modifier
                            .align(Alignment.TopStart)
                            .padding(8.dp)
                            .background(colors.background.copy(alpha = 0.8f), CircleShape)
                            .padding(horizontal = 8.dp, vertical = 2.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.foreground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = album.title,
                style = MaterialTheme.typography.titleSmall,
                color = colors.foreground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = album.artistNames ?: "Unknown artist",
                style = MaterialTheme.typography.bodySmall,
                color = colors.mutedForeground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (showMeta) {
                Spacer(Modifier.height(2.dp))
                Text(
                    text = meta,
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.mutedForeground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
    if (showMenu) AlbumMenu(album, sharer, onDismiss = { showMenu = false })
}

@Composable
fun AlbumPlaceholder(modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .background(MusicTheme.colors.muted, MaterialTheme.shapes.large),
        )
        PlaceholderBlock(Modifier.size(110.dp, 14.dp))
        PlaceholderBlock(Modifier.size(80.dp, 12.dp))
    }
}

@Composable
private fun AlbumMenu(
    album: AlbumSummary,
    sharer: AlbumSharer,
    onDismiss: () -> Unit,
) {
    val player = LocalPlayer.current
    MusicBottomSheet(
        title = album.title,
        subtitle = album.artistNames ?: "Unknown artist",
        onDismiss = onDismiss,
    ) { hide ->
        SheetAction(R.drawable.ic_play, "Play") {
            player.playAlbum(album.id, shuffle = false)
            hide()
        }
        SheetAction(R.drawable.ic_shuffle, "Shuffle") {
            player.playAlbum(album.id, shuffle = true)
            hide()
        }
        SheetAction(R.drawable.ic_list_start, "Play next") {
            player.queueAlbum(album.id, next = true)
            hide()
        }
        SheetAction(R.drawable.ic_list_plus, "Add to queue") {
            player.queueAlbum(album.id, next = false)
            hide()
        }
        SheetAction(R.drawable.ic_share, "Share") {
            sharer.share(album.id, album.title)
            hide()
        }
    }
}
