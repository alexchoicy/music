package com.alexchoicy.music.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.InteractionSource
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.alexchoicy.music.api.PartySummary
import com.alexchoicy.music.ui.plural
import com.alexchoicy.music.ui.theme.MusicTheme

val PartyArtworkMaxSize = 104.dp

@Composable
fun PartyTile(party: PartySummary, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = MusicTheme.colors

    val interactionSource = remember { MutableInteractionSource() }

    Column(
        modifier = modifier.clickable(
            interactionSource = interactionSource,
            indication = null,
            onClick = onClick,
        ),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        PartyAvatar(
            name = party.name,
            url = party.coverUrl,
            interactionSource = interactionSource,
            modifier = Modifier
                .widthIn(max = PartyArtworkMaxSize)
                .fillMaxWidth()
                .aspectRatio(1f),
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

@Composable
fun PartyAvatar(
    name: String,
    url: String?,
    modifier: Modifier = Modifier,
    initialsSize: TextUnit = 24.sp,
    interactionSource: InteractionSource? = null,
) {
    Artwork(
        url = url,
        shape = CircleShape,
        modifier = modifier,
        interactionSource = interactionSource,
        placeholder = {
            Text(
                text = initials(name),
                style = MaterialTheme.typography.headlineSmall.copy(fontSize = initialsSize),
                fontWeight = FontWeight.SemiBold,
                color = MusicTheme.colors.mutedForeground,
            )
        },
    )
}

private fun initials(name: String) =
    name.trim().split(Regex("\\s+")).mapNotNull { it.firstOrNull() }
        .joinToString("").take(2).uppercase().ifEmpty { "?" }
