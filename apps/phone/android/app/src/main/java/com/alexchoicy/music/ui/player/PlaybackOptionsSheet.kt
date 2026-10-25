package com.alexchoicy.music.ui.player

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.playback.MusicPlayer
import com.alexchoicy.music.playback.StreamQuality
import com.alexchoicy.music.ui.components.MusicBottomSheet
import com.alexchoicy.music.ui.components.Segmented
import com.alexchoicy.music.ui.components.SwitchRow
import com.alexchoicy.music.ui.theme.MusicTheme

@Composable
fun PlaybackOptionsSheet(
    player: MusicPlayer,
    onDismiss: () -> Unit,
) {
    val settings = player.settings
    MusicBottomSheet(title = "Playback", onDismiss = onDismiss) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Label("Streaming quality")
            Segmented(
                options = StreamQuality.entries,
                selected = settings.streamQuality,
                label = { it.label },
                onSelect = settings::updateStreamQuality,
                modifier = Modifier.padding(horizontal = 24.dp),
            )
        }
        Column {
            Label("Autoplay")
            SwitchRow(
                label = "Radio",
                checked = settings.radio,
                onCheckedChange = settings::updateRadio,
            )
            SwitchRow(
                label = "Autoplay Talk tracks",
                checked = settings.playTalkTracks,
                onCheckedChange = settings::updatePlayTalkTracks,
            )
            SwitchRow(
                label = "Autoplay Instrumental tracks",
                checked = settings.playInstrumentals,
                onCheckedChange = settings::updatePlayInstrumentals,
            )
        }
    }
}

@Composable
private fun Label(text: String) {
    Text(
        text = text,
        modifier = Modifier.padding(horizontal = 24.dp),
        style = MaterialTheme.typography.labelSmall,
        color = MusicTheme.colors.mutedForeground,
    )
}
