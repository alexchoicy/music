package com.alexchoicy.music.ui.playlists

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.alexchoicy.music.R
import com.alexchoicy.music.api.PlaybackTrack
import com.alexchoicy.music.api.PlaylistDetail
import com.alexchoicy.music.api.PlaylistEntry
import com.alexchoicy.music.offline.DownloadStats
import com.alexchoicy.music.playback.PlayerStatus
import com.alexchoicy.music.ui.albums.Eyebrow
import com.alexchoicy.music.ui.collection.fullWidthItem
import com.alexchoicy.music.ui.components.Artwork
import com.alexchoicy.music.ui.components.DownloadButton
import com.alexchoicy.music.ui.components.EmptyState
import com.alexchoicy.music.ui.components.MusicBottomSheet
import com.alexchoicy.music.ui.components.PlayingBars
import com.alexchoicy.music.ui.components.PlaylistCover
import com.alexchoicy.music.ui.components.SheetAction
import com.alexchoicy.music.ui.currentMusicApplication
import com.alexchoicy.music.ui.detail.DetailScreen
import com.alexchoicy.music.ui.detail.DetailViewModel
import com.alexchoicy.music.ui.formatDurationHoursMinutes
import com.alexchoicy.music.ui.formatPlaybackTime
import com.alexchoicy.music.ui.musicApplication
import com.alexchoicy.music.ui.player.LocalPlayer
import com.alexchoicy.music.ui.plural
import com.alexchoicy.music.ui.theme.MusicTheme
import com.alexchoicy.music.ui.theme.TabularNumbers
import com.alexchoicy.music.ui.theme.UNAVAILABLE_ALPHA

private val CoverSize = 200.dp

@Composable
fun PlaylistDetailScreen(
    playlistId: Long,
    contentPadding: PaddingValues,
    onBack: () -> Unit,
    onDeleted: () -> Unit,
    onOpenAlbum: (Long) -> Unit,
    onOpenParty: (Long) -> Unit,
    viewModel: DetailViewModel<PlaylistDetail> =
        viewModel {
            val repository = musicApplication().playlists
            DetailViewModel(snapshotFlow { repository.playlist(playlistId) }) { repository.sync(playlistId) }
        },
) {
    var showMenu by remember { mutableStateOf(false) }
    DetailScreen(
        viewModel = viewModel,
        noun = "playlist",
        contentPadding = contentPadding,
        onBack = onBack,
        title = { it.name },
        backdropUrl = { it.coverUrls.firstOrNull() },
        backdropAlpha = 0.5f,
        itemSpacing = 32.dp,
        hero = { playlist, titleModifier -> PlaylistHero(playlist, titleModifier) },
        actions = { playlist ->
            IconButton(onClick = { showMenu = true }) {
                Icon(
                    painterResource(R.drawable.ic_more_vertical),
                    contentDescription = "More actions for ${playlist.name}",
                    modifier = Modifier.size(22.dp),
                    tint = MusicTheme.colors.foreground,
                )
            }
        },
    ) { playlist ->
        fullWidthItem("tracks") { EntryList(playlist, onOpenAlbum, onOpenParty) }
    }
    val playlist = viewModel.item
    if (showMenu && playlist != null) {
        PlaylistMenu(target = playlist.toTarget(), onDismiss = { showMenu = false }, onDeleted = onDeleted)
    }
}

// Entries that can play now: with audio, and downloaded while offline.
@Composable
private fun availability(playlist: PlaylistDetail): List<Boolean> {
    val app = currentMusicApplication()
    return playlist.entries.map { it.track != null && (app.network.online || app.downloads.isDownloaded(it.trackId)) }
}

private fun playableTracks(
    playlist: PlaylistDetail,
    available: List<Boolean>,
): List<PlaybackTrack> = playlist.entries.mapIndexedNotNull { index, entry -> entry.track?.takeIf { available[index] } }

@Composable
private fun ColumnScope.PlaylistHero(
    playlist: PlaylistDetail,
    titleModifier: Modifier,
) {
    val colors = MusicTheme.colors
    val meta =
        listOfNotNull(
            plural(playlist.entries.size, "track"),
            formatDurationHoursMinutes(playlist.totalDurationMs),
        ).joinToString(" · ")

    Spacer(Modifier.height(8.dp))
    PlaylistCover(
        urls = playlist.coverUrls,
        shape = MaterialTheme.shapes.extraLarge,
        placeholderIconSize = 56.dp,
        modifier =
            Modifier
                .size(CoverSize)
                .align(Alignment.CenterHorizontally),
    )
    Spacer(Modifier.height(24.dp))
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Eyebrow("Playlist")
        Text(
            text = playlist.name,
            modifier = titleModifier,
            style = MaterialTheme.typography.headlineLarge,
            color = colors.foreground,
            textAlign = TextAlign.Center,
        )
        Text(
            text = meta,
            style = MaterialTheme.typography.bodySmall,
            color = colors.mutedForeground,
            textAlign = TextAlign.Center,
        )
    }
    Spacer(Modifier.height(16.dp))
    PlaylistActions(playlist)
}

@Composable
private fun PlaylistActions(playlist: PlaylistDetail) {
    val colors = MusicTheme.colors
    val player = LocalPlayer.current
    val tracks = playableTracks(playlist, availability(playlist))
    val enabled = tracks.isNotEmpty()
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        PlaylistDownloadButton(playlist, Modifier.offset(x = (-12).dp))
        Spacer(Modifier.weight(1f))
        IconButton(onClick = { player.playPlaylist(shuffle = true) { tracks } }, enabled = enabled) {
            Icon(
                painterResource(R.drawable.ic_shuffle),
                contentDescription = "Shuffle",
                modifier = Modifier.size(22.dp),
                tint = colors.foreground.copy(alpha = if (enabled) 1f else UNAVAILABLE_ALPHA),
            )
        }
        Spacer(Modifier.width(8.dp))
        Box(
            modifier =
                Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .alpha(if (enabled) 1f else UNAVAILABLE_ALPHA)
                    .background(colors.primary)
                    .clickable(enabled = enabled, onClickLabel = "Play playlist") {
                        player.playPlaylist(shuffle = false) { tracks }
                    },
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                painterResource(R.drawable.ic_play),
                contentDescription = "Play playlist",
                modifier =
                    Modifier
                        .size(24.dp)
                        .offset(x = 1.dp),
                tint = colors.primaryForeground,
            )
        }
    }
}

@Composable
private fun PlaylistDownloadButton(
    playlist: PlaylistDetail,
    modifier: Modifier,
) {
    val app = currentMusicApplication()
    val downloads = app.downloads
    val saved = downloads.playlists.firstOrNull { it.playlistId == playlist.id }
    if (saved == null && playlist.entries.isEmpty()) return
    DownloadButton(
        noun = "playlist",
        stats = saved?.let(downloads::playlistStats) ?: DownloadStats(0, 0, 0, 0),
        starting = playlist.id in downloads.startingPlaylists,
        downloaded = saved != null,
        cancelMessage =
            "Tracks downloaded so far will be deleted, except ones saved while playing or used by albums and other playlists.",
        removeMessage =
            "You won't be able to play this playlist offline. " +
                "Tracks saved while playing or used by albums and other playlists stay downloaded.",
        onDownload = {
            downloads.startPlaylistDownload(playlist) {
                app.notices.show("This playlist has no tracks that can be downloaded.")
            }
        },
        onRetry = { saved?.let(downloads::retryPlaylist) },
        onRemove = { downloads.remove(albumIds = emptyList(), playlistIds = listOf(playlist.id)) },
        modifier = modifier,
    )
}

@Composable
private fun EntryList(
    playlist: PlaylistDetail,
    onOpenAlbum: (Long) -> Unit,
    onOpenParty: (Long) -> Unit,
) {
    val player = LocalPlayer.current
    val app = currentMusicApplication()
    val available = availability(playlist)
    val tracks = playableTracks(playlist, available)
    var menuEntry by remember { mutableStateOf<PlaylistEntry?>(null) }
    var addingTrack by remember { mutableStateOf<PlaybackTrack?>(null) }

    if (playlist.entries.isEmpty()) {
        EmptyState(icon = R.drawable.ic_playlists, title = "This playlist is empty")
        return
    }
    Column {
        playlist.entries.forEachIndexed { index, entry ->
            EntryRow(
                entry = entry,
                current = player.isCurrent(entry.albumId, entry.trackId),
                playing = player.status == PlayerStatus.Playing,
                downloaded = app.downloads.isDownloaded(entry.trackId),
                available = available[index],
                onPlay = { player.playPlaylist(startIndex = available.take(index).count { it }) { tracks } },
                onMore = { menuEntry = entry },
            )
        }
    }
    menuEntry?.let { entry ->
        val track = entry.track
        val editable = app.network.online && playlist.version != null && entry.entryId != null
        MusicBottomSheet(
            title = entry.title,
            subtitle =
                listOfNotNull(
                    entry.artists.joinToString(", ") { it.name }.ifEmpty { null },
                    entry.albumTitle,
                ).joinToString(" · "),
            onDismiss = { menuEntry = null },
        ) { hide ->
            Column {
                if (track != null) {
                    SheetAction(R.drawable.ic_list_start, "Play next") {
                        player.playNext(listOf(track))
                        hide()
                    }
                    SheetAction(R.drawable.ic_list_plus, "Add to queue") {
                        player.addToQueue(listOf(track))
                        hide()
                    }
                    if (track.albumDiscId != null) {
                        SheetAction(R.drawable.ic_playlists, "Add to playlist…") {
                            addingTrack = track
                            hide()
                        }
                    }
                }
                SheetAction(
                    R.drawable.ic_list_x,
                    "Remove from this playlist",
                    enabled = editable,
                    destructive = true,
                ) {
                    app.playlists.removeEntry(playlist, entry)
                    hide()
                }
                SheetAction(R.drawable.ic_albums, "Go to album") {
                    hide()
                    onOpenAlbum(entry.albumId)
                }
                entry.artists.forEach { artist ->
                    SheetAction(R.drawable.ic_parties, "Go to ${artist.name}") {
                        hide()
                        onOpenParty(artist.partyId)
                    }
                }
            }
        }
    }
    addingTrack?.let { track ->
        val albumDiscId = track.albumDiscId ?: return@let
        AddToPlaylistSheet(albumDiscId, track.trackId, onDismiss = { addingTrack = null })
    }
}

@Composable
private fun EntryRow(
    entry: PlaylistEntry,
    current: Boolean,
    playing: Boolean,
    downloaded: Boolean,
    available: Boolean,
    onPlay: () -> Unit,
    onMore: () -> Unit,
) {
    val colors = MusicTheme.colors
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .heightIn(min = 56.dp)
                .clip(MaterialTheme.shapes.medium)
                .combinedClickable(
                    enabled = available,
                    onClickLabel = "Play",
                    onLongClickLabel = "More actions",
                    onLongClick = onMore,
                    onClick = onPlay,
                ).alpha(if (available) 1f else UNAVAILABLE_ALPHA)
                .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Artwork(
            url = entry.coverUrl,
            shape = MaterialTheme.shapes.small,
            placeholderIcon = R.drawable.ic_albums,
            placeholderIconSize = 20.dp,
            modifier = Modifier.size(40.dp),
        )
        Column(Modifier.weight(1f)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (current && playing) PlayingBars()
                Text(
                    text = entry.title,
                    modifier = Modifier.weight(1f, fill = false),
                    style = MaterialTheme.typography.titleSmall,
                    color = if (current) colors.primary else colors.foreground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Text(
                text = entry.albumTitle,
                style = MaterialTheme.typography.bodySmall,
                color = colors.mutedForeground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        if (downloaded) {
            Icon(
                painterResource(R.drawable.ic_downloaded),
                contentDescription = "Downloaded",
                modifier = Modifier.size(14.dp),
                tint = colors.primary,
            )
        }
        Text(
            text = formatPlaybackTime(entry.durationMs),
            style = MaterialTheme.typography.labelSmall.merge(TabularNumbers),
            color = colors.mutedForeground,
        )
        IconButton(onClick = onMore, modifier = Modifier.offset(x = 12.dp)) {
            Icon(
                painterResource(R.drawable.ic_more_vertical),
                contentDescription = "More actions for ${entry.title}",
                modifier = Modifier.size(18.dp),
                tint = colors.mutedForeground,
            )
        }
    }
}
