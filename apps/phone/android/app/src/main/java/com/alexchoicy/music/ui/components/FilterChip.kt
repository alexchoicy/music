package com.alexchoicy.music.ui.components

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.ui.theme.MusicTheme

@Composable
fun FilterChip(
    label: String,
    selected: Boolean,
    onSelectedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = MusicTheme.colors

    Row(
        modifier =
            modifier
                .minimumInteractiveComponentSize()
                .height(32.dp)
                .clip(CircleShape)
                .toggleable(value = selected, role = Role.Checkbox, onValueChange = onSelectedChange)
                .border(1.dp, if (selected) colors.primary else colors.border, CircleShape)
                .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = if (selected) colors.foreground else colors.mutedForeground,
            maxLines = 1,
        )
    }
}
