package com.alexchoicy.music.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

private fun textStyle(size: Int, lineHeight: Int, weight: FontWeight, heading: Boolean = false) =
    TextStyle(
        fontFamily = Geist,
        fontWeight = weight,
        fontSize = size.sp,
        lineHeight = lineHeight.sp,
        letterSpacing = if (heading) (-0.5).sp else 0.sp,
    )

internal val MusicTypography = Typography(
    displayLarge = textStyle(48, 52, FontWeight.Bold, heading = true),
    displayMedium = textStyle(36, 44, FontWeight.Bold, heading = true),
    displaySmall = textStyle(30, 38, FontWeight.Bold, heading = true),
    headlineLarge = textStyle(30, 38, FontWeight.Bold, heading = true),
    headlineMedium = textStyle(30, 38, FontWeight.Bold, heading = true),
    headlineSmall = textStyle(20, 28, FontWeight.SemiBold, heading = true),
    titleLarge = textStyle(20, 28, FontWeight.SemiBold, heading = true),
    titleMedium = textStyle(16, 24, FontWeight.SemiBold),
    titleSmall = textStyle(14, 20, FontWeight.SemiBold),
    bodyLarge = textStyle(16, 24, FontWeight.Normal),
    bodyMedium = textStyle(14, 20, FontWeight.Normal),
    bodySmall = textStyle(12, 16, FontWeight.Normal),
    labelLarge = textStyle(16, 24, FontWeight.Medium),
    labelMedium = textStyle(14, 20, FontWeight.Medium),
    labelSmall = textStyle(12, 16, FontWeight.Medium),
)
