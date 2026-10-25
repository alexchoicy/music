package com.alexchoicy.music.ui.playlists

import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.alexchoicy.music.R
import com.alexchoicy.music.api.PlaylistSummary
import com.alexchoicy.music.data.playlists.PlaylistRepository
import com.alexchoicy.music.playback.NetworkMonitor
import com.alexchoicy.music.ui.collection.fullWidthItem
import com.alexchoicy.music.ui.components.AlbumPlaceholder
import com.alexchoicy.music.ui.components.ButtonVariant
import com.alexchoicy.music.ui.components.EmptyState
import com.alexchoicy.music.ui.components.MusicButton
import com.alexchoicy.music.ui.components.MusicSnackbarHost
import com.alexchoicy.music.ui.components.PlaylistCover
import com.alexchoicy.music.ui.components.SearchField
import com.alexchoicy.music.ui.formatDurationHoursMinutes
import com.alexchoicy.music.ui.musicApplication
import com.alexchoicy.music.ui.player.LocalPlayer
import com.alexchoicy.music.ui.plural
import com.alexchoicy.music.ui.theme.MusicTheme
import com.alexchoicy.music.ui.theme.PageInset
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch

private const val PLACEHOLDER_COUNT = 6

class PlaylistsViewModel(
    val repository: PlaylistRepository,
    val network: NetworkMonitor,
) : ViewModel() {
    var syncing by mutableStateOf(false)
        private set
    var failed by mutableStateOf(false)
        private set
    var refreshing by mutableStateOf(false)
        private set

    // Without the list from the server, downloaded playlists still show.
    val playlists: List<PlaylistSummary>?
        get() =
            repository.playlists
                ?: repository.downloadedPlaylists.takeIf { (failed || !network.online) && it.isNotEmpty() }

    init {
        viewModelScope.launch {
            snapshotFlow { network.online }.filter { it }.collect { if (!syncing) sync() }
        }
        if (!network.online) failed = true
    }

    fun refresh() {
        refreshing = true
        if (!syncing) viewModelScope.launch { sync() }
    }

    private suspend fun sync() {
        syncing = true
        failed = false
        failed = !repository.syncList()
        syncing = false
        refreshing = false
    }
}

@Composable
fun PlaylistsScreen(
    contentPadding: PaddingValues,
    onOpenPlaylist: (Long) -> Unit,
    viewModel: PlaylistsViewModel =
        viewModel { PlaylistsViewModel(musicApplication().playlists, musicApplication().network) },
) {
    var search by rememberSaveable { mutableStateOf("") }
    var creating by rememberSaveable { mutableStateOf(false) }
    var menuPlaylist by remember { mutableStateOf<PlaylistSummary?>(null) }
    val playlists = viewModel.playlists
    // The endpoint has no search, and a user's playlists are few enough to filter here.
    val query = search.trim()
    val visible = if (query.isEmpty()) playlists else playlists?.filter { it.name.contains(query, ignoreCase = true) }
    val snackbarHostState = remember { SnackbarHostState() }
    val showRefreshError = viewModel.failed && playlists != null && viewModel.network.online

    LaunchedEffect(showRefreshError) {
        if (!showRefreshError) return@LaunchedEffect
        val result =
            snackbarHostState.showSnackbar(
                message = "Couldn't refresh playlists",
                actionLabel = "Retry",
                duration = SnackbarDuration.Indefinite,
                withDismissAction = true,
            )
        if (result == SnackbarResult.ActionPerformed) viewModel.refresh()
    }

    Column(
        modifier =
            Modifier
                .fillMaxSize()
                .padding(top = contentPadding.calculateTopPadding()),
    ) {
        Column(
            modifier = Modifier.padding(start = PageInset, top = PageInset, end = PageInset, bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Playlists",
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.headlineLarge,
                    color = MusicTheme.colors.foreground,
                )
                IconButton(onClick = { creating = true }) {
                    Icon(
                        painterResource(R.drawable.ic_plus),
                        contentDescription = "New playlist",
                        modifier = Modifier.size(20.dp),
                        tint = MusicTheme.colors.foreground,
                    )
                }
            }
            SearchField(value = search, onValueChange = { search = it }, placeholder = "Search playlists")
        }
        PullToRefreshBox(
            isRefreshing = viewModel.refreshing,
            onRefresh = viewModel::refresh,
            modifier = Modifier.fillMaxSize(),
        ) {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(150.dp),
                modifier = Modifier.fillMaxSize(),
                contentPadding =
                    PaddingValues(
                        start = PageInset,
                        top = 8.dp,
                        end = PageInset,
                        bottom = contentPadding.calculateBottomPadding() + PageInset,
                    ),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                when {
                    visible != null && visible.isEmpty() && query.isNotEmpty() ->
                        fullWidthItem { EmptyState(icon = R.drawable.ic_search, title = "No matching playlists") }

                    visible != null && visible.isEmpty() ->
                        fullWidthItem {
                            EmptyState(
                                icon = R.drawable.ic_playlists,
                                title = "No playlists yet",
                                action = {
                                    MusicButton(
                                        text = "New playlist",
                                        onClick = { creating = true },
                                        icon = R.drawable.ic_plus,
                                    )
                                },
                            )
                        }

                    visible != null ->
                        items(visible, key = { it.id }) { playlist ->
                            PlaylistTile(
                                playlist = playlist,
                                onClick = { onOpenPlaylist(playlist.id) },
                                onLongClick = { menuPlaylist = playlist },
                            )
                        }

                    viewModel.failed ->
                        fullWidthItem {
                            EmptyState(
                                icon = R.drawable.ic_cloud_off,
                                title = "Couldn't load playlists",
                                action = {
                                    MusicButton(
                                        text = "Try again",
                                        onClick = viewModel::refresh,
                                        variant = ButtonVariant.Ghost,
                                    )
                                },
                            )
                        }

                    else -> items(PLACEHOLDER_COUNT) { AlbumPlaceholder() }
                }
            }
            MusicSnackbarHost(
                hostState = snackbarHostState,
                modifier =
                    Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = contentPadding.calculateBottomPadding()),
            )
        }
    }

    if (creating) PlaylistNameSheet(onDismiss = { creating = false })
    menuPlaylist?.let { playlist ->
        val player = LocalPlayer.current
        val repository = viewModel.repository
        PlaylistMenu(
            target = playlist.toTarget(),
            onDismiss = { menuPlaylist = null },
            onPlay =
                if (playlist.trackCount > 0) {
                    { shuffle -> player.playPlaylist(shuffle = shuffle) { repository.loadPlayableTracks(playlist.id) } }
                } else {
                    null
                },
        )
    }
}

@Composable
private fun PlaylistTile(
    playlist: PlaylistSummary,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
) {
    val colors = MusicTheme.colors
    val interactionSource = remember { MutableInteractionSource() }
    val summary =
        if (playlist.trackCount == 0) {
            "Empty"
        } else {
            listOfNotNull(
                plural(playlist.trackCount, "track"),
                formatDurationHoursMinutes(playlist.totalDurationMs),
            ).joinToString(" · ")
        }

    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .combinedClickable(
                    interactionSource = interactionSource,
                    indication = null,
                    onLongClickLabel = "Playlist actions",
                    onLongClick = onLongClick,
                    onClick = onClick,
                ),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        PlaylistCover(
            urls = playlist.coverUrls,
            shape = MaterialTheme.shapes.large,
            interactionSource = interactionSource,
            modifier =
                Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f),
        )
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = playlist.name,
                style = MaterialTheme.typography.titleSmall,
                color = colors.foreground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = summary,
                style = MaterialTheme.typography.bodySmall,
                color = colors.mutedForeground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
