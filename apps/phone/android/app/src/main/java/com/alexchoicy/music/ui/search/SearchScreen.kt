package com.alexchoicy.music.ui.search

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.alexchoicy.music.R
import com.alexchoicy.music.api.AlbumSummary
import com.alexchoicy.music.api.MatchedTrack
import com.alexchoicy.music.ui.components.Artwork
import com.alexchoicy.music.ui.components.ButtonVariant
import com.alexchoicy.music.ui.components.EmptyState
import com.alexchoicy.music.ui.components.MainTab
import com.alexchoicy.music.ui.components.MusicButton
import com.alexchoicy.music.ui.components.PartyTile
import com.alexchoicy.music.ui.components.PlaceholderBlock
import com.alexchoicy.music.ui.components.SearchField
import com.alexchoicy.music.ui.currentMusicApplication
import com.alexchoicy.music.ui.musicApplication
import com.alexchoicy.music.ui.theme.MusicTheme
import com.alexchoicy.music.ui.theme.PageInset
import com.alexchoicy.music.ui.theme.UNAVAILABLE_ALPHA
import kotlinx.coroutines.flow.Flow

private val AlbumArtworkSize = 52.dp
private val RowGap = 12.dp
private val PartyTileWidth = 96.dp
private const val PLACEHOLDER_COUNT = 6

@Composable
fun SearchScreen(
    contentPadding: PaddingValues,
    onOpenAlbum: (Long) -> Unit,
    onOpenParty: (Long) -> Unit,
    reselects: Flow<MainTab>,
    viewModel: SearchViewModel =
        viewModel {
            SearchViewModel(musicApplication().searchRepository, musicApplication().network)
        },
) {
    val online = currentMusicApplication().network.online

    LaunchedEffect(reselects) {
        reselects.collect { if (it == MainTab.Search) viewModel.search = "" }
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
            Text(
                text = "Search",
                style = MaterialTheme.typography.headlineLarge,
                color = MusicTheme.colors.foreground,
            )
            SearchField(
                value = viewModel.search,
                onValueChange = { viewModel.search = it },
                placeholder = "Albums, tracks, parties",
            )
        }
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding =
                PaddingValues(
                    top = 8.dp,
                    bottom = contentPadding.calculateBottomPadding() + PageInset,
                ),
        ) {
            when (val state = viewModel.state) {
                SearchState.Idle ->
                    item {
                        EmptyState(
                            icon = R.drawable.ic_search,
                            title = "Search your library",
                            modifier = Modifier.padding(horizontal = PageInset),
                        )
                    }
                SearchState.Loading -> items(PLACEHOLDER_COUNT) { RowPlaceholder() }
                SearchState.Failed ->
                    item {
                        EmptyState(
                            icon = R.drawable.ic_cloud_off,
                            title = "Couldn't search",
                            modifier = Modifier.padding(horizontal = PageInset),
                            action = {
                                MusicButton(
                                    text = "Try again",
                                    onClick = viewModel::retry,
                                    variant = ButtonVariant.Ghost,
                                    loading = viewModel.retrying,
                                )
                            },
                        )
                    }
                is SearchState.Loaded ->
                    results(
                        state = state,
                        onOpenAlbum = onOpenAlbum,
                        onOpenParty = onOpenParty,
                    )
            }
        }
    }
}

private fun LazyListScope.results(
    state: SearchState.Loaded,
    onOpenAlbum: (Long) -> Unit,
    onOpenParty: (Long) -> Unit,
) {
    val albums = state.results.albums
    val parties = state.results.parties
    if (state.offline) item(key = "notice") { OfflineNotice() }
    if (albums.isEmpty() && parties.isEmpty()) {
        item(key = "empty") {
            EmptyState(
                icon = R.drawable.ic_search,
                title = "No results for “${state.query}”",
                modifier = Modifier.padding(horizontal = PageInset),
            )
        }
        return
    }
    if (parties.isNotEmpty()) {
        item(key = "parties-header") { SectionHeader("Parties") }
        item(key = "parties") {
            LazyRow(
                modifier = Modifier.padding(bottom = 16.dp),
                contentPadding = PaddingValues(horizontal = PageInset),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                items(parties, key = { it.id }) { party ->
                    PartyTile(party, onClick = { onOpenParty(party.id) }, Modifier.width(PartyTileWidth))
                }
            }
        }
    }
    if (albums.isNotEmpty()) {
        item(key = "albums-header") { SectionHeader("Albums") }
        albums.forEach { (album, tracks) ->
            item(key = "album-${album.id}") { AlbumRow(album, onClick = { onOpenAlbum(album.id) }) }
            items(tracks, key = { "track-${album.id}-${it.trackId}" }) { track ->
                TrackRow(track, onClick = { onOpenAlbum(album.id) })
            }
        }
    }
}

@Composable
private fun OfflineNotice() {
    val colors = MusicTheme.colors
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(start = PageInset, end = PageInset, bottom = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            painterResource(R.drawable.ic_cloud_off),
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = colors.mutedForeground,
        )
        Text(
            text = "You're offline, so the library saved on this device is searched.",
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.bodySmall,
            color = colors.mutedForeground,
        )
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        modifier =
            Modifier
                .padding(horizontal = PageInset)
                .heightIn(min = 44.dp)
                .padding(vertical = 8.dp),
        style = MaterialTheme.typography.titleLarge,
        color = MusicTheme.colors.foreground,
    )
}

@Composable
private fun AlbumRow(
    album: AlbumSummary,
    onClick: () -> Unit,
) {
    val colors = MusicTheme.colors
    val app = currentMusicApplication()
    val available = app.network.online || album.id in app.downloads.downloadedAlbums

    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(horizontal = PageInset, vertical = 8.dp)
                .alpha(if (available) 1f else UNAVAILABLE_ALPHA),
        horizontalArrangement = Arrangement.spacedBy(RowGap),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Artwork(
            url = album.coverUrl,
            shape = MaterialTheme.shapes.small,
            placeholderIcon = R.drawable.ic_albums,
            placeholderIconSize = 22.dp,
            modifier = Modifier.size(AlbumArtworkSize),
        )
        Column(Modifier.weight(1f)) {
            Text(
                text = album.title,
                style = MaterialTheme.typography.titleSmall,
                color = colors.foreground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = "${album.type} · ${album.artistNames ?: "Unknown artist"}",
                style = MaterialTheme.typography.bodySmall,
                color = colors.mutedForeground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun TrackRow(
    track: MatchedTrack,
    onClick: () -> Unit,
) {
    val colors = MusicTheme.colors
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clickable(onClickLabel = "Open album", onClick = onClick)
                .heightIn(min = 48.dp)
                .padding(start = PageInset + AlbumArtworkSize + RowGap, end = PageInset, top = 6.dp, bottom = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(RowGap),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Artwork(
            url = track.coverUrl,
            shape = MaterialTheme.shapes.extraSmall,
            placeholderIcon = R.drawable.ic_albums,
            placeholderIconSize = 16.dp,
            modifier = Modifier.size(32.dp),
        )
        Column(Modifier.weight(1f)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "${track.discNumber}-${track.trackNumber.toString().padStart(2, '0')}",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.mutedForeground,
                )
                Text(
                    text = track.title,
                    modifier = Modifier.weight(1f, fill = false),
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.foreground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            if (track.basedOnTitle != null) {
                Text(
                    text = "Based on ${track.basedOnTitle}",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.mutedForeground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun RowPlaceholder() {
    Row(
        modifier = Modifier.padding(horizontal = PageInset, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(RowGap),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(AlbumArtworkSize)
                .background(MusicTheme.colors.muted, MaterialTheme.shapes.small),
        )
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            PlaceholderBlock(Modifier.size(160.dp, 14.dp))
            PlaceholderBlock(Modifier.size(100.dp, 12.dp))
        }
    }
}
