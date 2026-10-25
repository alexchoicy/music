package com.alexchoicy.music.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.R
import com.alexchoicy.music.offline.DownloadStats
import com.alexchoicy.music.offline.Downloads
import com.alexchoicy.music.offline.OfflineAlbum
import com.alexchoicy.music.offline.OfflinePlaylist
import com.alexchoicy.music.ui.components.Artwork
import com.alexchoicy.music.ui.components.ButtonVariant
import com.alexchoicy.music.ui.components.ConfirmDialog
import com.alexchoicy.music.ui.components.EmptyState
import com.alexchoicy.music.ui.components.MusicButton
import com.alexchoicy.music.ui.currentMusicApplication
import com.alexchoicy.music.ui.formatFileSize
import com.alexchoicy.music.ui.plural
import com.alexchoicy.music.ui.theme.MusicTheme
import com.alexchoicy.music.ui.theme.PageInset

private sealed interface DownloadItem {
    val key: String
    val stats: DownloadStats

    data class Album(
        val album: OfflineAlbum,
        override val stats: DownloadStats,
    ) : DownloadItem {
        override val key get() = "album:${album.albumId}"
    }

    data class Playlist(
        val playlist: OfflinePlaylist,
        override val stats: DownloadStats,
    ) : DownloadItem {
        override val key get() = "playlist:${playlist.playlistId}"
    }
}

@Composable
fun DownloadsScreen(
    contentPadding: PaddingValues,
    onBack: () -> Unit,
    onOpenAlbum: (Long) -> Unit,
    onOpenPlaylist: (Long) -> Unit,
) {
    val app = currentMusicApplication()
    val downloads = app.downloads
    val waiting =
        when {
            !app.network.online -> "Waiting for a connection"
            !app.playbackSettings.downloadOnMobileData && !app.network.unmetered -> "Waiting for Wi-Fi"
            else -> null
        }
    var selected by remember { mutableStateOf<Set<String>?>(null) }
    var confirmDelete by remember { mutableStateOf(false) }
    val items = downloadItems(downloads)
    val selecting = selected
    // Downloads removed while selected drop out.
    val selectedItems = items.filter { selecting?.contains(it.key) == true }
    val playlistCount = items.count { it is DownloadItem.Playlist }
    val albumCount = items.size - playlistCount

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding =
                PaddingValues(
                    top = contentPadding.calculateTopPadding(),
                    bottom = contentPadding.calculateBottomPadding() + if (selecting != null) 88.dp else PageInset,
                ),
        ) {
            item {
                PageHeader("Downloads", onBack) {
                    if (items.isNotEmpty()) {
                        TextButton(onClick = { selected = if (selecting == null) emptySet() else null }) {
                            Text(
                                text = if (selecting == null) "Select" else "Done",
                                style = MaterialTheme.typography.labelLarge,
                                color = MusicTheme.colors.foreground,
                            )
                        }
                    }
                }
            }
            if (items.isEmpty()) {
                item {
                    EmptyState(
                        icon = R.drawable.ic_download,
                        title = "No downloads",
                        modifier = Modifier.padding(horizontal = PageInset),
                    )
                }
            } else {
                item {
                    Text(
                        text =
                            listOfNotNull(
                                plural(playlistCount, "playlist").takeIf { playlistCount > 0 },
                                plural(albumCount, "album").takeIf { albumCount > 0 },
                                formatFileSize(downloads.totalSize()),
                            ).joinToString(" · "),
                        modifier = Modifier.padding(start = PageInset, end = PageInset, top = 4.dp, bottom = 16.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MusicTheme.colors.mutedForeground,
                    )
                }
            }
            items(items, key = { it.key }) { item ->
                DownloadRow(
                    item = item,
                    waiting = waiting,
                    selected = selecting?.contains(item.key),
                    onClick = {
                        when {
                            selecting != null -> selected = selecting.toggle(item.key)
                            item is DownloadItem.Album -> onOpenAlbum(item.album.albumId)
                            item is DownloadItem.Playlist -> onOpenPlaylist(item.playlist.playlistId)
                        }
                    },
                    onRetry = {
                        when (item) {
                            is DownloadItem.Album -> downloads.retryAlbum(item.album.albumId)
                            is DownloadItem.Playlist -> downloads.retryPlaylist(item.playlist)
                        }
                    },
                )
            }
        }
        if (selecting != null) {
            val allSelected = selectedItems.size == items.size && items.isNotEmpty()
            Row(
                modifier =
                    Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .background(MusicTheme.colors.background)
                        .padding(
                            start = PageInset,
                            end = PageInset,
                            top = 12.dp,
                            bottom = contentPadding.calculateBottomPadding() + 12.dp,
                        ),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                MusicButton(
                    text = if (allSelected) "Deselect all" else "Select all",
                    onClick = { selected = if (allSelected) emptySet() else items.map { it.key }.toSet() },
                    variant = ButtonVariant.Secondary,
                    modifier = Modifier.weight(1f),
                )
                MusicButton(
                    text = if (selectedItems.isEmpty()) "Delete" else "Delete (${selectedItems.size})",
                    onClick = { confirmDelete = true },
                    enabled = selectedItems.isNotEmpty(),
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }

    if (confirmDelete) {
        val count = selectedItems.size
        ConfirmDialog(
            title = "Delete ${plural(count, "download")}?",
            message =
                "This frees up to ${formatFileSize(selectedItems.sumOf { it.stats.sizeInBytes })}. " +
                    "${if (count == 1) "It stays" else "They stay"} in your library.",
            confirmLabel = "Delete",
            onConfirm = {
                downloads.remove(
                    albumIds = selectedItems.filterIsInstance<DownloadItem.Album>().map { it.album.albumId },
                    playlistIds = selectedItems.filterIsInstance<DownloadItem.Playlist>().map { it.playlist.playlistId },
                )
                selected = null
            },
            onDismiss = { confirmDelete = false },
        )
    }
}

private fun Set<String>.toggle(key: String) = if (key in this) this - key else this + key

// Partial albums list only the tracks saved while playing; playlists list their own.
private fun downloadItems(downloads: Downloads): List<DownloadItem> {
    val playlistTrackIds = downloads.playlists.flatMap { it.trackIds }.toSet()
    val playlists =
        downloads.playlists
            .sortedByDescending { it.downloadedAt }
            .map { DownloadItem.Playlist(it, downloads.playlistStats(it)) }
    val albums =
        downloads.albums.values.sortedByDescending { it.downloadedAt }.mapNotNull { album ->
            val stats =
                if (album.whole) {
                    downloads.albumStats(album.albumId)
                } else {
                    downloads.albumStats(album.albumId) { it.played || it.trackId !in playlistTrackIds }
                }
            if (!album.whole && stats.total == 0) null else DownloadItem.Album(album, stats)
        }
    return playlists + albums
}

@Composable
private fun DownloadRow(
    item: DownloadItem,
    waiting: String?,
    selected: Boolean?,
    onClick: () -> Unit,
    onRetry: () -> Unit,
) {
    val colors = MusicTheme.colors
    val stats = item.stats
    val (title, subtitle, coverUrl) =
        when (item) {
            is DownloadItem.Album -> Triple(item.album.title, item.album.artists ?: "Unknown artist", item.album.coverUrl)
            is DownloadItem.Playlist -> Triple(item.playlist.name, "Playlist", item.playlist.coverUrl)
        }
    val noun = if (item is DownloadItem.Album && !item.album.whole) "played track" else "track"
    val failed = stats.failed > 0 && !stats.active
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .heightIn(min = 72.dp)
                .padding(start = PageInset, end = 12.dp, top = 8.dp, bottom = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (selected != null) {
            Box(
                modifier =
                    Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(if (selected) colors.primary else colors.background)
                        .border(2.dp, if (selected) colors.primary else colors.input, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                if (selected) {
                    Icon(
                        painterResource(R.drawable.ic_check),
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = colors.primaryForeground,
                    )
                }
            }
        }
        Artwork(
            url = coverUrl,
            shape = MaterialTheme.shapes.small,
            placeholderIcon = if (item is DownloadItem.Playlist) R.drawable.ic_playlists else R.drawable.ic_albums,
            placeholderIconSize = 22.dp,
            modifier = Modifier.size(52.dp),
        )
        Column(Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                color = colors.foreground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = colors.mutedForeground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = downloadStatus(stats, noun, waiting),
                style = MaterialTheme.typography.bodySmall,
                color = if (stats.failed > 0) colors.destructiveForeground else colors.mutedForeground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        if (failed && selected == null) {
            IconButton(onClick = onRetry) {
                Icon(
                    painterResource(R.drawable.ic_retry),
                    contentDescription = "Retry failed downloads of $title",
                    modifier = Modifier.size(20.dp),
                    tint = colors.foreground,
                )
            }
        }
    }
}

internal fun downloadStatus(
    stats: DownloadStats,
    noun: String,
    waiting: String?,
): String {
    if (stats.total == 0) return "No tracks"
    val tracks = plural(stats.total, noun)
    if (stats.active) {
        val failed = if (stats.failed > 0) " · ${stats.failed} failed" else ""
        val progress = "${stats.downloaded} of $tracks$failed"
        return if (waiting != null) "$waiting · $progress" else "Downloading $progress"
    }
    if (stats.failed > 0) return "${stats.failed} of $tracks failed"
    return "$tracks · ${formatFileSize(stats.sizeInBytes)}"
}
