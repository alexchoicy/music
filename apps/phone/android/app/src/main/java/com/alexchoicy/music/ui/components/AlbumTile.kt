package com.alexchoicy.music.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.R
import com.alexchoicy.music.api.AlbumSummary
import com.alexchoicy.music.ui.formatDurationHoursMinutes
import com.alexchoicy.music.ui.plural
import com.alexchoicy.music.ui.theme.MusicTheme

@Composable
fun AlbumTile(
    album: AlbumSummary,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    showMeta: Boolean = true,
) {
    val colors = MusicTheme.colors
    val meta = listOfNotNull(
        plural(album.trackCount, "track"),
        formatDurationHoursMinutes(album.totalDurationMs),
    ).joinToString(" · ")

    val interactionSource = remember { MutableInteractionSource() }

    Column(
        modifier = modifier.clickable(
            interactionSource = interactionSource,
            indication = null,
            onClick = onClick,
        ),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box {
            Artwork(
                url = album.coverUrl,
                shape = MaterialTheme.shapes.large,
                placeholderIcon = R.drawable.ic_albums,
                interactionSource = interactionSource,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f),
            )
            if (album.type != "Album") {
                Text(
                    text = album.type,
                    modifier = Modifier
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
}
