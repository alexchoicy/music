package com.alexchoicy.music.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.alexchoicy.music.api.PartySummary
import com.alexchoicy.music.ui.plural
import com.alexchoicy.music.ui.theme.MusicTheme

@Composable
fun PartyTile(party: PartySummary, modifier: Modifier = Modifier) {
    val colors = MusicTheme.colors

    Column(
        modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Artwork(
            url = party.coverUrl,
            shape = CircleShape,
            modifier = Modifier.size(104.dp),
            placeholder = {
                Text(
                    text = initials(party.name),
                    style = MaterialTheme.typography.headlineSmall.copy(fontSize = 24.sp),
                    fontWeight = FontWeight.SemiBold,
                    color = colors.mutedForeground,
                )
            },
        )
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = party.name,
                style = MaterialTheme.typography.titleSmall,
                color = colors.foreground,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = plural(party.albumCount, "release"),
                style = MaterialTheme.typography.bodySmall,
                color = colors.mutedForeground,
            )
        }
    }
}

private fun initials(name: String) =
    name.trim().split(Regex("\\s+")).mapNotNull { it.firstOrNull() }
        .joinToString("").take(2).uppercase().ifEmpty { "?" }
