package com.alexchoicy.music.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.ui.theme.MusicColors
import com.alexchoicy.music.ui.theme.MusicTheme

@Composable
fun MusicTextField(
    value: TextFieldValue,
    onValueChange: (TextFieldValue) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    error: String? = null,
    placeholder: String? = null,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None,
) {
    val colors = MusicTheme.colors
    val typography = MaterialTheme.typography
    val interactionSource = remember { MutableInteractionSource() }
    val focused by interactionSource.collectIsFocusedAsState()
    val borderColor =
        when {
            error != null -> colors.destructive
            focused -> colors.primary
            else -> colors.input
        }

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            label,
            modifier = Modifier.clearAndSetSemantics {},
            color = colors.foreground,
            style = typography.labelMedium,
        )
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier =
                modifier
                    .fillMaxWidth()
                    .semantics(mergeDescendants = true) {
                        contentDescription = label
                        if (error != null) error(error)
                    },
            singleLine = true,
            textStyle = typography.bodyLarge.copy(color = colors.foreground),
            cursorBrush = SolidColor(colors.primary),
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            visualTransformation = visualTransformation,
            interactionSource = interactionSource,
            decorationBox = { innerTextField ->
                Box(
                    modifier =
                        Modifier
                            .height(48.dp)
                            .fieldFrame(colors, focused, borderColor)
                            .padding(horizontal = 12.dp),
                    contentAlignment = Alignment.CenterStart,
                ) {
                    if (value.text.isEmpty() && placeholder != null) {
                        Text(
                            placeholder,
                            modifier = Modifier.clearAndSetSemantics {},
                            color = colors.mutedForeground,
                            style = typography.bodyLarge,
                        )
                    }
                    innerTextField()
                }
            },
        )
        if (error != null) {
            Text(
                error,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Assertive },
                color = colors.destructiveForeground,
                style = typography.bodyMedium,
            )
        }
    }
}

@Composable
internal fun Modifier.fieldFrame(
    colors: MusicColors,
    focused: Boolean,
    borderColor: Color,
) = this
    .drawBehind {
        if (!focused) return@drawBehind
        val spread = 3.dp.toPx()
        drawRoundRect(
            color = colors.ring.copy(alpha = 0.32f),
            topLeft = Offset(-spread / 2, -spread / 2),
            size = Size(size.width + spread, size.height + spread),
            cornerRadius = CornerRadius(8.dp.toPx() + spread / 2),
            style = Stroke(spread),
        )
    }.background(colors.card, MaterialTheme.shapes.medium)
    .border(1.dp, borderColor, MaterialTheme.shapes.medium)
