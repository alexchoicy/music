package com.alexchoicy.music.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.ui.theme.MusicTheme

@Composable
fun <T> Segmented(
    options: List<T>,
    selected: T,
    label: (T) -> String,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = MusicTheme.colors
    val selectedSurface = if (isSystemInDarkTheme()) colors.input else colors.background
    Row(
        modifier =
            modifier
                .fillMaxWidth()
                .background(colors.muted, MaterialTheme.shapes.medium)
                .padding(2.dp)
                .selectableGroup(),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        options.forEach { option ->
            val isSelected = option == selected
            Box(
                modifier =
                    Modifier
                        .weight(1f)
                        .height(40.dp)
                        .then(if (isSelected) Modifier.shadow(1.dp, MaterialTheme.shapes.small) else Modifier)
                        .clip(MaterialTheme.shapes.small)
                        .background(if (isSelected) selectedSurface else Color.Transparent)
                        .selectable(selected = isSelected, role = Role.RadioButton, onClick = { onSelect(option) }),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = label(option),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Medium,
                    color = if (isSelected) colors.foreground else colors.mutedForeground.copy(alpha = 0.72f),
                    maxLines = 1,
                )
            }
        }
    }
}
