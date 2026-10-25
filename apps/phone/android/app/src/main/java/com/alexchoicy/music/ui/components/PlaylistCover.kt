package com.alexchoicy.music.ui.components

import androidx.compose.foundation.interaction.InteractionSource
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.alexchoicy.music.R

// A mosaic of up to four disc covers, repeated to fill it, or a single cover or placeholder.
@Composable
fun PlaylistCover(
    urls: List<String>,
    shape: Shape,
    modifier: Modifier = Modifier,
    placeholderIconSize: Dp = 40.dp,
    interactionSource: InteractionSource? = null,
) {
    if (urls.size <= 1) {
        Artwork(
            url = urls.firstOrNull(),
            shape = shape,
            modifier = modifier,
            placeholderIcon = R.drawable.ic_playlists,
            placeholderIconSize = placeholderIconSize,
            interactionSource = interactionSource,
        )
        return
    }
    Artwork(url = null, shape = shape, modifier = modifier, interactionSource = interactionSource) {
        Column(Modifier.fillMaxSize()) {
            repeat(2) { row ->
                Row(Modifier.weight(1f)) {
                    repeat(2) { column ->
                        AsyncImage(
                            model = urls[(row * 2 + column) % urls.size],
                            contentDescription = null,
                            modifier =
                                Modifier
                                    .weight(1f)
                                    .fillMaxHeight(),
                            contentScale = ContentScale.Crop,
                        )
                    }
                }
            }
        }
    }
}
