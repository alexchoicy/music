package com.alexchoicy.music.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.alexchoicy.music.R
import com.alexchoicy.music.api.ContinueListeningItem
import com.alexchoicy.music.api.HomeFeed
import com.alexchoicy.music.api.LibraryStats
import com.alexchoicy.music.ui.components.AlbumTile
import com.alexchoicy.music.ui.components.Artwork
import com.alexchoicy.music.ui.components.ButtonVariant
import com.alexchoicy.music.ui.components.MainTab
import com.alexchoicy.music.ui.components.MusicButton
import com.alexchoicy.music.ui.components.MusicSnackbarHost
import com.alexchoicy.music.ui.components.PartyTile
import com.alexchoicy.music.ui.components.PlaceholderBlock
import com.alexchoicy.music.ui.formatCount
import com.alexchoicy.music.ui.formatPlaybackTime
import com.alexchoicy.music.ui.formatRelativeTime
import com.alexchoicy.music.ui.musicApplication
import com.alexchoicy.music.ui.theme.MusicTheme

private val PageInset = 24.dp
private val SquareTileWidth = 150.dp

@Composable
fun HomeScreen(
    contentPadding: PaddingValues,
    onOpenTab: (MainTab) -> Unit,
    onOpenAlbum: (Long) -> Unit,
    onOpenParty: (Long) -> Unit,
    viewModel: HomeViewModel = viewModel { HomeViewModel(musicApplication().homeRepository) },
) {
    val feed = viewModel.feed
    val snackbarHostState = remember { SnackbarHostState() }
    val showRefreshError = viewModel.failed && feed != null

    LaunchedEffect(showRefreshError) {
        if (!showRefreshError) return@LaunchedEffect
        val result = snackbarHostState.showSnackbar(
            message = "Couldn't refresh home",
            actionLabel = "Retry",
            duration = SnackbarDuration.Indefinite,
            withDismissAction = true,
        )
        if (result == SnackbarResult.ActionPerformed) viewModel.refresh()
    }

    PullToRefreshBox(
        isRefreshing = viewModel.loading && feed != null,
        onRefresh = viewModel::refresh,
        modifier = Modifier
            .fillMaxSize()
            .padding(top = contentPadding.calculateTopPadding()),
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                top = PageInset,
                bottom = contentPadding.calculateBottomPadding() + PageInset,
            ),
            verticalArrangement = Arrangement.spacedBy(32.dp),
        ) {
            item {
                Text(
                    text = "Home",
                    modifier = Modifier.padding(horizontal = PageInset),
                    style = MaterialTheme.typography.headlineLarge,
                    color = MusicTheme.colors.foreground,
                )
            }
            when {
                feed != null -> homeContent(feed, onOpenTab, onOpenAlbum, onOpenParty)
                viewModel.failed -> item { LoadError(onRetry = viewModel::refresh) }
                else -> item { HomePlaceholder() }
            }
        }
        MusicSnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = contentPadding.calculateBottomPadding()),
        )
    }
}

private fun LazyListScope.homeContent(
    feed: HomeFeed,
    onOpenTab: (MainTab) -> Unit,
    onOpenAlbum: (Long) -> Unit,
    onOpenParty: (Long) -> Unit,
) {
    item { LibraryCounts(feed.stats, onOpenTab) }

    if (feed.continueListening.isNotEmpty()) {
        item {
            HomeSection("Continue listening", spacing = 12.dp) {
                Column(Modifier.padding(horizontal = PageInset - 12.dp)) {
                    feed.continueListening.take(6).forEach {
                        ContinueListeningRow(it, onClick = { onOpenAlbum(it.album.id) })
                    }
                }
            }
        }
    }
    if (feed.recentlyPlayed.isNotEmpty()) {
        item {
            HomeSection("Recently played") {
                TileRow(feed.recentlyPlayed, key = { it.id }) {
                    AlbumTile(it, onClick = { onOpenAlbum(it.id) }, Modifier.width(SquareTileWidth))
                }
            }
        }
    }
    if (feed.recentAlbums.isNotEmpty()) {
        item {
            HomeSection("Recently added albums", onViewAll = { onOpenTab(MainTab.Albums) }) {
                TileRow(feed.recentAlbums, key = { it.id }) {
                    AlbumTile(it, onClick = { onOpenAlbum(it.id) }, Modifier.width(SquareTileWidth))
                }
            }
        }
    }
    if (feed.recentParties.isNotEmpty()) {
        item {
            HomeSection("Recently added parties", onViewAll = { onOpenTab(MainTab.Parties) }) {
                TileRow(feed.recentParties, key = { it.id }) {
                    PartyTile(it, onClick = { onOpenParty(it.id) }, Modifier.width(SquareTileWidth))
                }
            }
        }
    }
}

@Composable
private fun LibraryCounts(stats: LibraryStats, onOpenTab: (MainTab) -> Unit) {
    val counts = listOf(
        Triple("Albums", stats.albumCount, MainTab.Albums),
        Triple("Parties", stats.partyCount, MainTab.Parties),
    )
    Row(Modifier.padding(horizontal = PageInset - 12.dp)) {
        counts.forEach { (label, count, tab) ->
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(MaterialTheme.shapes.medium)
                    .then(Modifier.clickable { onOpenTab(tab) })
                    .padding(horizontal = 12.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodySmall,
                    color = MusicTheme.colors.mutedForeground,
                )
                Text(
                    text = formatCount(count),
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = MusicTheme.colors.foreground,
                    maxLines = 1,
                )
            }
        }
    }
}

@Composable
private fun HomeSection(
    title: String,
    spacing: Dp = 16.dp,
    onViewAll: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(spacing)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = PageInset, end = PageInset - 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = title,
                modifier = Modifier
                    .weight(1f)
                    .padding(end = 16.dp),
                style = MaterialTheme.typography.titleLarge,
                color = MusicTheme.colors.foreground,
            )
            if (onViewAll != null) {
                Box(
                    modifier = Modifier
                        .heightIn(min = 44.dp)
                        .clip(MaterialTheme.shapes.extraSmall)
                        .clickable(onClick = onViewAll)
                        .padding(horizontal = 12.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "View all",
                        style = MaterialTheme.typography.labelMedium,
                        color = MusicTheme.colors.mutedForeground,
                    )
                }
            } else {
                Spacer(Modifier.height(44.dp))
            }
        }
        content()
    }
}

@Composable
private fun <T> TileRow(items: List<T>, key: (T) -> Any, tile: @Composable (T) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = PageInset),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        items(items, key = key) { tile(it) }
    }
}

@Composable
private fun ContinueListeningRow(item: ContinueListeningItem, onClick: () -> Unit) {
    val colors = MusicTheme.colors
    val album = item.album
    val durationMs = item.durationMs.coerceAtLeast(0)
    val positionMs = item.positionMs.coerceIn(0, durationMs)
    val status = item.updatedAt?.let(::formatRelativeTime)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.large)
            .clickable(onClick = onClick)
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Artwork(
            url = album.coverUrl,
            shape = MaterialTheme.shapes.medium,
            placeholderIcon = R.drawable.ic_albums,
            placeholderIconSize = 28.dp,
            modifier = Modifier.size(64.dp),
        )
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Column {
                Text(
                    text = item.trackTitle,
                    style = MaterialTheme.typography.titleSmall,
                    color = colors.foreground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = "${album.title} · ${album.artistNames ?: "Unknown artist"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.mutedForeground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    painterResource(R.drawable.ic_monitor_speaker),
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = colors.mutedForeground,
                )
                Text(
                    text = listOfNotNull(item.deviceName, status).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.mutedForeground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                LinearProgressIndicator(
                    progress = { if (durationMs > 0) positionMs.toFloat() / durationMs else 0f },
                    modifier = Modifier
                        .weight(1f)
                        .height(4.dp),
                    color = colors.primary,
                    trackColor = colors.secondary,
                    strokeCap = StrokeCap.Round,
                    gapSize = 0.dp,
                    drawStopIndicator = {},
                )
                Text(
                    text = "${formatPlaybackTime(positionMs)} / ${formatPlaybackTime(durationMs)}",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.mutedForeground,
                )
            }
        }
    }
}

@Composable
private fun LoadError(onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = PageInset),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = "Couldn't load home",
            style = MaterialTheme.typography.titleMedium,
            color = MusicTheme.colors.foreground,
        )
        Text(
            text = "Check your connection to the server, then try again.",
            style = MaterialTheme.typography.bodyMedium,
            color = MusicTheme.colors.mutedForeground,
        )
        MusicButton(text = "Try again", onClick = onRetry, variant = ButtonVariant.Ghost)
    }
}

@Composable
private fun HomePlaceholder() {
    Column(verticalArrangement = Arrangement.spacedBy(32.dp)) {
        Row(
            modifier = Modifier.padding(horizontal = PageInset),
            horizontalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            repeat(3) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    PlaceholderBlock(Modifier.size(48.dp, 12.dp))
                    PlaceholderBlock(Modifier.size(72.dp, 30.dp))
                }
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            PlaceholderBlock(
                Modifier
                    .padding(horizontal = PageInset)
                    .size(180.dp, 20.dp),
            )
            LazyRow(
                contentPadding = PaddingValues(horizontal = PageInset),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                userScrollEnabled = false,
            ) {
                items(3) {
                    Column(
                        modifier = Modifier.width(SquareTileWidth),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .aspectRatio(1f)
                                .background(MusicTheme.colors.muted, MaterialTheme.shapes.large),
                        )
                        PlaceholderBlock(Modifier.size(110.dp, 14.dp))
                        PlaceholderBlock(Modifier.size(80.dp, 12.dp))
                    }
                }
            }
        }
    }
}
