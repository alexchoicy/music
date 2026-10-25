package com.alexchoicy.music.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.ui.theme.MusicTheme

@Composable
fun Tag(
    text: String,
    modifier: Modifier = Modifier,
    outlined: Boolean = false,
) {
    val colors = MusicTheme.colors
    Text(
        text = text,
        modifier =
            modifier
                .background(if (outlined) Color.Transparent else colors.secondary, CircleShape)
                .border(1.dp, if (outlined) colors.border else Color.Transparent, CircleShape)
                .padding(horizontal = 8.dp, vertical = 2.dp),
        style = MaterialTheme.typography.labelSmall,
        color = colors.foreground,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
    )
}
