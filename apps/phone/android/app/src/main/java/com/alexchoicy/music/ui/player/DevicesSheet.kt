package com.alexchoicy.music.ui.player

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.R
import com.alexchoicy.music.devices.MAX_DEVICE_NAME_LENGTH
import com.alexchoicy.music.devices.OtherDevice
import com.alexchoicy.music.devices.PlaybackDevices
import com.alexchoicy.music.devices.PlaybackState
import com.alexchoicy.music.ui.components.ButtonVariant
import com.alexchoicy.music.ui.components.MusicBottomSheet
import com.alexchoicy.music.ui.components.MusicButton
import com.alexchoicy.music.ui.components.MusicTextField
import com.alexchoicy.music.ui.components.SheetOption
import com.alexchoicy.music.ui.components.Tag
import com.alexchoicy.music.ui.currentMusicApplication
import com.alexchoicy.music.ui.theme.MusicTheme

@Composable
fun DevicesSheet(onDismiss: () -> Unit) {
    val devices = currentMusicApplication().devices
    MusicBottomSheet(title = "Devices", onDismiss = onDismiss) {
        Column {
            Label("This phone")
            DeviceName(devices)
        }
        Column {
            Label("Other devices")
            val others = devices.otherDevices
            when {
                !devices.connected -> Message("Not connected. Devices appear once the live connection is back.")
                others.isEmpty() -> Message("No other devices are connected.")
                else ->
                    others.forEach { device ->
                        DeviceRow(devices, device, discordSource = device.deviceId == devices.discordDeviceId)
                    }
            }
        }
        if (devices.connected) DiscordPresence(devices)
    }
}

@Composable
private fun DeviceName(devices: PlaybackDevices) {
    val colors = MusicTheme.colors
    var draft by remember { mutableStateOf<TextFieldValue?>(null) }
    val editing = draft
    if (editing == null) {
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .padding(start = 24.dp, end = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = devices.displayName,
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.bodyLarge,
                color = colors.foreground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            IconButton(
                onClick = {
                    draft = TextFieldValue(devices.displayName, TextRange(0, devices.displayName.length))
                },
            ) {
                Icon(
                    painterResource(R.drawable.ic_pencil),
                    contentDescription = "Rename this phone",
                    modifier = Modifier.size(20.dp),
                    tint = colors.foreground,
                )
            }
        }
        return
    }
    val save = {
        val name = editing.text.trim()
        if (name != devices.displayName) devices.rename(name.ifEmpty { devices.defaultName })
        draft = null
    }
    Column(
        modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        MusicTextField(
            value = editing,
            onValueChange = { draft = it.copy(text = it.text.take(MAX_DEVICE_NAME_LENGTH)) },
            label = "Device name",
            placeholder = devices.defaultName,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { save() }),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            MusicButton(
                text = "Cancel",
                onClick = { draft = null },
                variant = ButtonVariant.Secondary,
                modifier = Modifier.weight(1f),
            )
            MusicButton(text = "Save", onClick = save, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun DeviceRow(
    devices: PlaybackDevices,
    device: OtherDevice,
    discordSource: Boolean,
) {
    val colors = MusicTheme.colors
    val transfer = devices.transfer
    val hasTrack = device.state?.track != null
    val playing = device.state?.status == "playing"
    val moving = transfer?.sessionId == device.sessionId
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .heightIn(min = 64.dp)
                .padding(start = 24.dp, end = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            painterResource(R.drawable.ic_monitor_speaker),
            contentDescription = null,
            modifier = Modifier.size(22.dp),
            tint = if (playing) colors.primary else colors.mutedForeground,
        )
        Column(Modifier.weight(1f)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = device.name,
                    modifier = Modifier.weight(1f, fill = false),
                    style = MaterialTheme.typography.titleSmall,
                    color = colors.foreground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (discordSource) Tag("Discord", outlined = true)
            }
            Text(
                text = describePlayback(device.state),
                style = MaterialTheme.typography.bodySmall,
                color = colors.mutedForeground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        IconButton(onClick = { devices.control(device, play = !playing) }, enabled = hasTrack) {
            Icon(
                painterResource(if (playing) R.drawable.ic_pause else R.drawable.ic_play),
                contentDescription = "${if (playing) "Pause" else "Play"} on ${device.name}",
                modifier = Modifier.size(20.dp),
                tint = if (hasTrack) colors.foreground else colors.mutedForeground,
            )
        }
        IconButton(
            onClick = { devices.moveHere(device) },
            enabled = hasTrack && transfer == null,
        ) {
            if (moving) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = colors.foreground,
                    strokeWidth = 2.dp,
                )
            } else {
                Icon(
                    painterResource(R.drawable.ic_move_here),
                    contentDescription = "Move playback from ${device.name} to this phone",
                    modifier = Modifier.size(20.dp),
                    tint = if (hasTrack && transfer == null) colors.foreground else colors.mutedForeground,
                )
            }
        }
    }
}

@Composable
private fun DiscordPresence(devices: PlaybackDevices) {
    val options =
        buildList {
            add(null to "Automatic (latest to start playing)")
            devices.devices.forEach { device ->
                add(device.deviceId to if (device.deviceId == devices.deviceId) "${device.name} (this phone)" else device.name)
            }
            val selected = devices.discordDeviceId
            if (selected != null && none { it.first == selected }) add(selected to "Disconnected device")
        }
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Label("Discord presence")
        options.forEach { (deviceId, label) ->
            SheetOption(
                label = label,
                selected = deviceId == devices.discordDeviceId,
                onClick = { devices.selectDiscordDevice(deviceId) },
            )
        }
    }
}

private fun describePlayback(state: PlaybackState?): String {
    val track = state?.track ?: return "Nothing playing"
    val status =
        when (state.status) {
            "playing" -> "Playing"
            "loading" -> "Loading"
            "idle" -> "Stopped"
            else -> "Paused"
        }
    val artists = track.artists.joinToString(", ")
    return "$status · ${track.title}${if (artists.isEmpty()) "" else " – $artists"}"
}

@Composable
private fun Label(text: String) {
    Text(
        text = text,
        modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp),
        style = MaterialTheme.typography.labelSmall,
        color = MusicTheme.colors.mutedForeground,
    )
}

@Composable
private fun Message(text: String) {
    Text(
        text = text,
        modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
        style = MaterialTheme.typography.bodyMedium,
        color = MusicTheme.colors.mutedForeground,
    )
}
