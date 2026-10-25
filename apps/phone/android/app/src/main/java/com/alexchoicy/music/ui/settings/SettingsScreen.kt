package com.alexchoicy.music.ui.settings

import androidx.annotation.DrawableRes
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.R
import com.alexchoicy.music.playback.AudioQuality
import com.alexchoicy.music.playback.StreamQuality
import com.alexchoicy.music.ui.components.Segmented
import com.alexchoicy.music.ui.components.SwitchRow
import com.alexchoicy.music.ui.currentMusicApplication
import com.alexchoicy.music.ui.formatFileSize
import com.alexchoicy.music.ui.player.DevicesSheet
import com.alexchoicy.music.ui.plural
import com.alexchoicy.music.ui.theme.MusicTheme
import com.alexchoicy.music.ui.theme.PageInset

@Composable
fun SettingsScreen(
    contentPadding: PaddingValues,
    onBack: () -> Unit,
    onOpenDownloads: () -> Unit,
) {
    val app = currentMusicApplication()
    val settings = app.playbackSettings
    val downloads = app.downloads
    val devices = app.devices
    var showDevices by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding =
            PaddingValues(
                top = contentPadding.calculateTopPadding(),
                bottom = contentPadding.calculateBottomPadding() + PageInset,
            ),
        verticalArrangement = Arrangement.spacedBy(32.dp),
    ) {
        item { PageHeader("Settings", onBack) }
        item {
            Section("Audio quality") {
                Choices("Streaming quality", StreamQuality.entries, settings.streamQuality, { it.label }) {
                    settings.updateStreamQuality(it)
                }
                Choices("Download quality", AudioQuality.entries, settings.downloadQuality, { it.label }) {
                    settings.updateDownloadQuality(it)
                }
            }
        }
        item {
            Section("Offline") {
                Column {
                    SwitchRow(
                        label = "Save played tracks",
                        checked = settings.savePlayedTracks,
                        onCheckedChange = settings::updateSavePlayedTracks,
                    )
                    SwitchRow(
                        label = "Upgrade saved tracks on Wi-Fi",
                        checked = settings.upgradeOnWifi,
                        onCheckedChange = settings::updateUpgradeOnWifi,
                    )
                    SwitchRow(
                        label = "Download using mobile data",
                        checked = settings.downloadOnMobileData,
                        onCheckedChange = settings::updateDownloadOnMobileData,
                    )
                }
            }
        }
        item {
            val others = devices.otherDevices.size
            Section("Devices") {
                LinkRow(
                    icon = R.drawable.ic_monitor_speaker,
                    title = "Devices",
                    subtitle =
                        when {
                            !devices.connected -> "${devices.displayName} · Not connected"
                            others == 0 -> "${devices.displayName} · No other devices"
                            else -> "${devices.displayName} · ${plural(others, "other device")}"
                        },
                    onClick = { showDevices = true },
                )
            }
        }
        item {
            val albums = downloads.albums.size
            val playlists = downloads.playlists.size
            Section("Storage") {
                LinkRow(
                    icon = R.drawable.ic_download,
                    title = "Downloads",
                    subtitle =
                        if (albums + playlists == 0) {
                            "Nothing downloaded"
                        } else {
                            listOfNotNull(
                                plural(playlists, "playlist").takeIf { playlists > 0 },
                                plural(albums, "album").takeIf { albums > 0 },
                                formatFileSize(downloads.totalSize()),
                            ).joinToString(" · ")
                        },
                    onClick = onOpenDownloads,
                )
            }
        }
    }

    if (showDevices) DevicesSheet(onDismiss = { showDevices = false })
}

@Composable
internal fun PageHeader(
    title: String,
    onBack: () -> Unit,
    action: (@Composable () -> Unit)? = null,
) {
    Column(Modifier.padding(horizontal = PageInset)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack, modifier = Modifier.offset(x = (-12).dp)) {
                Icon(
                    painterResource(R.drawable.ic_arrow_left),
                    contentDescription = "Back",
                    modifier = Modifier.size(20.dp),
                    tint = MusicTheme.colors.foreground,
                )
            }
            Spacer(Modifier.weight(1f))
            if (action != null) action()
        }
        Text(
            text = title,
            style = MaterialTheme.typography.headlineLarge,
            color = MusicTheme.colors.foreground,
        )
    }
}

@Composable
private fun Section(
    title: String,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            text = title,
            modifier = Modifier.padding(horizontal = PageInset),
            style = MaterialTheme.typography.titleLarge,
            color = MusicTheme.colors.foreground,
        )
        content()
    }
}

@Composable
private fun <T> Choices(
    label: String,
    options: List<T>,
    selected: T,
    name: (T) -> String,
    onSelect: (T) -> Unit,
) {
    Column(
        modifier = Modifier.padding(horizontal = PageInset),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MusicTheme.colors.mutedForeground,
        )
        Segmented(options = options, selected = selected, label = name, onSelect = onSelect)
    }
}

@Composable
private fun LinkRow(
    @DrawableRes icon: Int,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    val colors = MusicTheme.colors
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .heightIn(min = 56.dp)
                .padding(horizontal = PageInset, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(icon), contentDescription = null, modifier = Modifier.size(22.dp), tint = colors.foreground)
        Column(Modifier.weight(1f)) {
            Text(text = title, style = MaterialTheme.typography.bodyLarge, color = colors.foreground)
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = colors.mutedForeground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Icon(
            painterResource(R.drawable.ic_chevron_right),
            contentDescription = null,
            modifier = Modifier.size(18.dp),
            tint = colors.mutedForeground,
        )
    }
}
