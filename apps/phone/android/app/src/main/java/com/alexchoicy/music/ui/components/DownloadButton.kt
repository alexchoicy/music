package com.alexchoicy.music.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.R
import com.alexchoicy.music.offline.DownloadStats
import com.alexchoicy.music.ui.theme.MusicTheme
import com.alexchoicy.music.ui.theme.TabularNumbers

// Downloads, shows progress, and retries or removes the download of an album or playlist.
@Composable
fun DownloadButton(
    noun: String,
    stats: DownloadStats,
    starting: Boolean,
    downloaded: Boolean,
    cancelMessage: String,
    removeMessage: String,
    onDownload: () -> Unit,
    onRetry: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = MusicTheme.colors
    var confirmRemove by remember { mutableStateOf(false) }
    val active = downloaded && stats.active
    val failed = downloaded && !active && stats.failed > 0
    // Its tracks were removed, or none can download; new ones download as they are added.
    val empty = downloaded && !active && stats.total == 0
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        IconButton(
            onClick = {
                when {
                    starting -> Unit
                    !downloaded -> onDownload()
                    failed -> onRetry()
                    else -> confirmRemove = true
                }
            },
        ) {
            when {
                starting || active ->
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = colors.primary,
                        strokeWidth = 2.dp,
                    )

                else ->
                    Icon(
                        painterResource(
                            when {
                                failed -> R.drawable.ic_alert
                                downloaded -> R.drawable.ic_downloaded
                                else -> R.drawable.ic_download
                            },
                        ),
                        contentDescription =
                            when {
                                failed -> "${stats.failed} of ${stats.total} tracks failed to download, retry"
                                empty -> "Downloaded, no tracks available offline, remove download"
                                downloaded -> "Downloaded, remove download"
                                else -> "Download $noun"
                            },
                        modifier = Modifier.size(22.dp),
                        tint =
                            when {
                                failed -> colors.destructiveForeground
                                downloaded -> colors.primary
                                else -> colors.foreground
                            },
                    )
            }
        }
        val status =
            when {
                active -> "${stats.downloaded}/${stats.total}"
                failed -> "${stats.failed} failed"
                empty -> "No tracks"
                else -> null
            }
        if (status != null) {
            Text(
                text = status,
                modifier =
                    Modifier.clickable {
                        if (failed) onRetry() else confirmRemove = true
                    },
                style = MaterialTheme.typography.labelSmall.merge(TabularNumbers),
                color = if (failed) colors.destructiveForeground else colors.mutedForeground,
            )
        }
    }
    if (confirmRemove) {
        ConfirmDialog(
            title = if (active) "Cancel download?" else "Remove download?",
            message = if (active) cancelMessage else removeMessage,
            confirmLabel = if (active) "Cancel download" else "Remove",
            cancelLabel = if (active) "Keep downloading" else "Cancel",
            onConfirm = onRemove,
            onDismiss = { confirmRemove = false },
        )
    }
}
