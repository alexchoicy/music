package com.alexchoicy.music.ui.components

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.ui.theme.MusicTheme

private val BarHeights = listOf(7f, 12f, 9f)
private const val CYCLE_MS = 900
private const val BAR_OFFSET = 1f / 3f
private val EaseInOut = CubicBezierEasing(0.42f, 0f, 0.58f, 1f)

@Composable
fun PlayingBars(modifier: Modifier = Modifier) {
    val color = MusicTheme.colors.primary
    val progress by rememberInfiniteTransition(label = "playingBars").animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(CYCLE_MS, easing = LinearEasing)),
        label = "progress",
    )
    Canvas(modifier.size(width = 10.dp, height = 12.dp)) {
        val unit = size.height / 12f
        BarHeights.forEachIndexed { index, height ->
            val phase = (progress + index * BAR_OFFSET) % 1f
            val half = if (phase < 0.5f) phase * 2f else (1f - phase) * 2f
            val barHeight = height * unit * (1f - 0.65f * EaseInOut.transform(half))
            drawRoundRect(
                color = color,
                topLeft = Offset(index * 4f * unit, size.height - barHeight),
                size = Size(2f * unit, barHeight),
                cornerRadius = CornerRadius(unit),
            )
        }
    }
}
