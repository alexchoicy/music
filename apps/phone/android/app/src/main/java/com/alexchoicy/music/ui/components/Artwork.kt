package com.alexchoicy.music.ui.components

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.alexchoicy.music.ui.theme.MusicTheme

@Composable
fun Artwork(
    url: String?,
    shape: Shape,
    modifier: Modifier = Modifier,
    @DrawableRes placeholderIcon: Int? = null,
    placeholderIconSize: Dp = 40.dp,
    placeholder: @Composable () -> Unit = {
        if (placeholderIcon != null) {
            Icon(
                painterResource(placeholderIcon),
                contentDescription = null,
                modifier = Modifier.size(placeholderIconSize),
                tint = MusicTheme.colors.mutedForeground,
            )
        }
    },
) {
    var failed by remember(url) { mutableStateOf(false) }
    Box(
        modifier = modifier
            .shadow(2.dp, shape)
            .clip(shape)
            .background(MusicTheme.colors.muted),
        contentAlignment = Alignment.Center,
    ) {
        if (url == null || failed) {
            placeholder()
        } else {
            AsyncImage(
                model = url,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
                onError = { failed = true },
            )
        }
    }
}
