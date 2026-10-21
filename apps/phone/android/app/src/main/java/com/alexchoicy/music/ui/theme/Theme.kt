package com.alexchoicy.music.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf

private val LocalMusicColors = staticCompositionLocalOf { DarkMusicColors }

object MusicTheme {
    val colors: MusicColors
        @Composable
        @ReadOnlyComposable
        get() = LocalMusicColors.current
}

@Composable
fun MusicTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colors = if (darkTheme) DarkMusicColors else LightMusicColors
    val baseScheme = if (darkTheme) darkColorScheme() else lightColorScheme()
    val colorScheme = baseScheme.copy(
        primary = colors.primary,
        onPrimary = colors.primaryForeground,
        primaryContainer = colors.secondary,
        onPrimaryContainer = colors.foreground,
        inversePrimary = if (darkTheme) LightMusicColors.primary else DarkMusicColors.primary,
        secondary = colors.secondary,
        onSecondary = colors.foreground,
        secondaryContainer = colors.sidebarAccent,
        onSecondaryContainer = colors.foreground,
        tertiary = colors.info,
        onTertiary = colors.onInfo,
        tertiaryContainer = colors.muted,
        onTertiaryContainer = colors.foreground,
        background = colors.background,
        onBackground = colors.foreground,
        surface = colors.card,
        onSurface = colors.foreground,
        surfaceVariant = colors.muted,
        onSurfaceVariant = colors.mutedForeground,
        surfaceTint = colors.primary,
        inverseSurface = if (darkTheme) LightMusicColors.card else DarkMusicColors.card,
        inverseOnSurface = if (darkTheme) {
            LightMusicColors.foreground
        } else {
            DarkMusicColors.foreground
        },
        error = colors.destructive,
        onError = colors.onDestructive,
        errorContainer = colors.destructive.copy(alpha = if (darkTheme) 0.16f else 0.08f),
        onErrorContainer = colors.destructiveForeground,
        outline = colors.input,
        outlineVariant = colors.border,
        scrim = colors.scrim,
        surfaceBright = colors.popover,
        surfaceDim = colors.background,
        surfaceContainerLowest = colors.background,
        surfaceContainerLow = colors.card,
        surfaceContainer = colors.card,
        surfaceContainerHigh = colors.popover,
        surfaceContainerHighest = colors.accent,
    )

    CompositionLocalProvider(LocalMusicColors provides colors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = MusicTypography,
            shapes = MusicShapes,
            content = content,
        )
    }
}
