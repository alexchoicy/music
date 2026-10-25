package com.alexchoicy.music.ui.albums

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
import androidx.compose.foundation.layout.widthIn
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withLink
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.alexchoicy.music.R
import com.alexchoicy.music.api.AlbumDetail
import com.alexchoicy.music.api.AlbumDisc
import com.alexchoicy.music.api.AlbumTrack
import com.alexchoicy.music.api.Credit
import com.alexchoicy.music.playback.PlayerStatus
import com.alexchoicy.music.ui.collection.fullWidthItem
import com.alexchoicy.music.ui.components.Artwork
import com.alexchoicy.music.ui.components.DownloadButton
import com.alexchoicy.music.ui.components.MusicBottomSheet
import com.alexchoicy.music.ui.components.PartyAvatar
import com.alexchoicy.music.ui.components.PlayingBars
import com.alexchoicy.music.ui.components.SheetAction
import com.alexchoicy.music.ui.components.Tag
import com.alexchoicy.music.ui.currentMusicApplication
import com.alexchoicy.music.ui.detail.DetailScreen
import com.alexchoicy.music.ui.detail.DetailViewModel
import com.alexchoicy.music.ui.formatDate
import com.alexchoicy.music.ui.formatDurationHoursMinutes
import com.alexchoicy.music.ui.formatPlaybackTime
import com.alexchoicy.music.ui.musicApplication
import com.alexchoicy.music.ui.player.LocalPlayer
import com.alexchoicy.music.ui.playlists.AddToPlaylistSheet
import com.alexchoicy.music.ui.plural
import com.alexchoicy.music.ui.rememberAlbumSharer
import com.alexchoicy.music.ui.theme.MusicTheme
import com.alexchoicy.music.ui.theme.TabularNumbers
import com.alexchoicy.music.ui.theme.UNAVAILABLE_ALPHA

private val CoverSize = 200.dp

@Composable
fun AlbumDetailScreen(
    albumId: Long,
    contentPadding: PaddingValues,
    onBack: () -> Unit,
    onOpenParty: (Long) -> Unit,
    viewModel: DetailViewModel<AlbumDetail> =
        viewModel {
            val repository = musicApplication().detailRepository
            DetailViewModel(repository.album(albumId)) { repository.syncAlbum(albumId) }
        },
) {
    DetailScreen(
        viewModel = viewModel,
        noun = "album",
        contentPadding = contentPadding,
        onBack = onBack,
        title = { it.title },
        backdropUrl = { it.coverUrl },
        backdropAlpha = 0.5f,
        itemSpacing = 32.dp,
        hero = { album, titleModifier -> AlbumHero(album, titleModifier, onOpenParty) },
        actions = { AlbumMenuButton(it) },
    ) { album ->
        fullWidthItem("tracks") { TrackList(album, onOpenParty) }
        fullWidthItem("credits") { AlbumCredits(album, onOpenParty) }
        fullWidthItem("about") { AlbumAbout(album) }
    }
}

@Composable
private fun ColumnScope.AlbumHero(
    album: AlbumDetail,
    titleModifier: Modifier,
    onOpenParty: (Long) -> Unit,
) {
    val colors = MusicTheme.colors
    val meta =
        listOfNotNull(
            album.releaseDate?.let(::formatDate),
            plural(album.trackCount, "track"),
            formatDurationHoursMinutes(album.totalDurationMs),
        ).joinToString(" · ")
    val artists = album.credits.distinctBy { it.partyId }

    Spacer(Modifier.height(8.dp))
    Artwork(
        url = album.coverUrl,
        shape = MaterialTheme.shapes.extraLarge,
        placeholderIcon = R.drawable.ic_albums,
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
        Eyebrow(album.type)
        Text(
            text = album.title,
            modifier = titleModifier,
            style = MaterialTheme.typography.headlineLarge,
            color = colors.foreground,
            textAlign = TextAlign.Center,
        )
        Text(
            text =
                if (artists.isEmpty()) {
                    buildAnnotatedString { append("Unknown artist") }
                } else {
                    buildAnnotatedString {
                        artists.forEachIndexed { index, credit ->
                            if (index > 0) append(", ")
                            withLink(
                                LinkAnnotation.Clickable(
                                    tag = credit.partyId.toString(),
                                    styles = TextLinkStyles(SpanStyle(color = colors.foreground)),
                                ) { onOpenParty(credit.partyId) },
                            ) { append(credit.name) }
                        }
                    }
                },
            style = MaterialTheme.typography.bodyLarge,
            color = colors.mutedForeground,
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
    AlbumActions(album)
}

@Composable
private fun AlbumActions(album: AlbumDetail) {
    val colors = MusicTheme.colors
    val player = LocalPlayer.current
    val albumId = album.id
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AlbumDownloadButton(albumId, Modifier.offset(x = (-12).dp))
        Spacer(Modifier.weight(1f))
        IconButton(onClick = { player.playAlbum(albumId, shuffle = true) }) {
            Icon(
                painterResource(R.drawable.ic_shuffle),
                contentDescription = "Shuffle",
                modifier = Modifier.size(22.dp),
                tint = colors.foreground,
            )
        }
        Spacer(Modifier.width(8.dp))
        Box(
            modifier =
                Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(colors.primary)
                    .clickable(onClickLabel = "Play album") {
                        player.playAlbum(
                            albumId,
                            shuffle = false,
                        )
                    },
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                painterResource(R.drawable.ic_play),
                contentDescription = "Play album",
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
private fun AlbumMenuButton(album: AlbumDetail) {
    val player = LocalPlayer.current
    val albumId = album.id
    var showMenu by remember { mutableStateOf(false) }
    val sharer = rememberAlbumSharer()
    IconButton(onClick = { showMenu = true }) {
        Icon(
            painterResource(R.drawable.ic_more_vertical),
            contentDescription = "More actions for ${album.title}",
            modifier = Modifier.size(22.dp),
            tint = MusicTheme.colors.foreground,
        )
    }
    if (showMenu) {
        MusicBottomSheet(
            title = album.title,
            subtitle =
                album.credits
                    .distinctBy { it.partyId }
                    .joinToString(", ") { it.name }
                    .ifEmpty { "Unknown artist" },
            onDismiss = { showMenu = false },
        ) { hide ->
            Column {
                SheetAction(R.drawable.ic_list_start, "Play next") {
                    player.queueAlbum(albumId, next = true)
                    hide()
                }
                SheetAction(R.drawable.ic_list_plus, "Add to queue") {
                    player.queueAlbum(albumId, next = false)
                    hide()
                }
                SheetAction(R.drawable.ic_share, "Share") {
                    sharer.share(albumId, album.title)
                    hide()
                }
            }
        }
    }
}

@Composable
private fun TrackList(
    album: AlbumDetail,
    onOpenParty: (Long) -> Unit,
) {
    val player = LocalPlayer.current
    val app = currentMusicApplication()
    val showDiscBands = album.discs.size > 1
    var menuTrack by remember { mutableStateOf<Pair<AlbumDisc, AlbumTrack>?>(null) }
    var addingTrack by remember { mutableStateOf<Pair<AlbumDisc, AlbumTrack>?>(null) }
    val sharer = rememberAlbumSharer()
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        album.discs.forEach { disc ->
            Column {
                if (showDiscBands) DiscBand(disc)
                disc.tracks.forEach { track ->
                    val downloaded = app.downloads.isDownloaded(track.trackId)
                    TrackRow(
                        track = track,
                        current = player.isCurrent(album.id, track.trackId),
                        playing = player.status == PlayerStatus.Playing,
                        downloaded = downloaded,
                        available = app.network.online || downloaded,
                        onPlay = { player.playAlbum(album.id, startTrackId = track.trackId) },
                        onMore = { menuTrack = disc to track },
                    )
                }
            }
        }
    }
    menuTrack?.let { (disc, track) ->
        MusicBottomSheet(
            title = track.title,
            subtitle = track.credits.joinToString(", ") { it.name }.ifEmpty { "No credits" },
            onDismiss = { menuTrack = null },
        ) { hide ->
            Column {
                SheetAction(R.drawable.ic_list_start, "Play next") {
                    player.queueAlbum(album.id, next = true, trackId = track.trackId)
                    hide()
                }
                SheetAction(R.drawable.ic_list_plus, "Add to queue") {
                    player.queueAlbum(album.id, next = false, trackId = track.trackId)
                    hide()
                }
                SheetAction(R.drawable.ic_playlists, "Add to playlist…") {
                    addingTrack = disc to track
                    hide()
                }
                SheetAction(R.drawable.ic_share, "Share") {
                    sharer.share(album.id, "${track.title} from ${album.title}", track.trackId)
                    hide()
                }
                track.credits.distinctBy { it.partyId }.forEach { credit ->
                    SheetAction(R.drawable.ic_parties, "Go to ${credit.name}") {
                        hide()
                        onOpenParty(credit.partyId)
                    }
                }
            }
        }
    }
    addingTrack?.let { (disc, track) ->
        AddToPlaylistSheet(disc.id, track.trackId, onDismiss = { addingTrack = null })
    }
}

@Composable
private fun AlbumDownloadButton(
    albumId: Long,
    modifier: Modifier,
) {
    val app = currentMusicApplication()
    val downloads = app.downloads
    val stats = downloads.albumStats(albumId)
    DownloadButton(
        noun = "album",
        stats = stats,
        starting = albumId in downloads.startingAlbums,
        downloaded = downloads.albums[albumId]?.whole == true && stats.total > 0,
        cancelMessage = "Tracks downloaded so far will be deleted.",
        removeMessage = "You won't be able to play this album offline.",
        onDownload = { downloads.startAlbumDownload(albumId) { app.notices.show("Couldn't download album") } },
        onRetry = { downloads.retryAlbum(albumId) },
        onRemove = { downloads.remove(albumIds = listOf(albumId), playlistIds = emptyList()) },
        modifier = modifier,
    )
}

@Composable
private fun DiscBand(disc: AlbumDisc) {
    val colors = MusicTheme.colors
    val meta =
        listOfNotNull(
            plural(disc.tracks.size, "track"),
            formatDurationHoursMinutes(disc.tracks.sumOf { it.durationMs }),
        ).joinToString(" · ")

    Row(
        modifier = Modifier.padding(bottom = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Eyebrow("Disc ${disc.discNumber}")
        Text(
            text = disc.subtitle.orEmpty(),
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.titleSmall,
            color = colors.foreground,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = meta,
            style = MaterialTheme.typography.bodySmall,
            color = colors.mutedForeground,
            maxLines = 1,
        )
    }
}

@Composable
private fun TrackRow(
    track: AlbumTrack,
    current: Boolean,
    playing: Boolean,
    downloaded: Boolean,
    available: Boolean,
    onPlay: () -> Unit,
    onMore: () -> Unit,
) {
    val colors = MusicTheme.colors
    val badges =
        listOfNotNull(
            track.versionType.takeIf { it != "Original" },
            track.contentType.takeIf { it != "Music" }?.let { if (it == "MC") "Talk" else it },
        )

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
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.widthIn(min = 24.dp)) {
            if (current && playing) {
                PlayingBars()
            } else {
                Text(
                    text = track.trackNumber.toString(),
                    style = MaterialTheme.typography.labelMedium.merge(TabularNumbers),
                    color = if (current) colors.primary else colors.mutedForeground,
                )
            }
        }
        Column(Modifier.weight(1f)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = track.title,
                    modifier = Modifier.weight(1f, fill = false),
                    style = MaterialTheme.typography.titleSmall,
                    color = if (current) colors.primary else colors.foreground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                badges.forEach { Tag(it) }
            }
            Text(
                text = track.credits.joinToString(", ") { it.name }.ifEmpty { "No credits" },
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
            text = formatPlaybackTime(track.durationMs),
            style = MaterialTheme.typography.labelSmall.merge(TabularNumbers),
            color = colors.mutedForeground,
        )
        IconButton(onClick = onMore, modifier = Modifier.offset(x = 12.dp)) {
            Icon(
                painterResource(R.drawable.ic_more_vertical),
                contentDescription = "More actions for ${track.title}",
                modifier = Modifier.size(18.dp),
                tint = colors.mutedForeground,
            )
        }
    }
}

@Composable
private fun AlbumCredits(
    album: AlbumDetail,
    onOpenParty: (Long) -> Unit,
) {
    val albumCreditKeys = album.credits.map { it.partyId to it.creditType }.toSet()
    val trackCredits =
        album.discs
            .flatMap { disc -> disc.tracks.flatMap { it.credits } }
            .distinctBy { it.partyId to it.creditType }
            .filterNot { (it.partyId to it.creditType) in albumCreditKeys }

    Section("Credits") {
        if (album.credits.isEmpty()) {
            Text(
                text = "No album credits.",
                style = MaterialTheme.typography.bodyMedium,
                color = MusicTheme.colors.mutedForeground,
            )
        } else {
            CreditList(album.credits, onOpenParty)
        }
        if (trackCredits.isNotEmpty()) {
            Text(
                text = "Track credits",
                modifier = Modifier.padding(top = 8.dp),
                style = MaterialTheme.typography.labelSmall,
                color = MusicTheme.colors.mutedForeground,
            )
            CreditList(trackCredits, onOpenParty)
        }
    }
}

@Composable
private fun CreditList(
    credits: List<Credit>,
    onOpenParty: (Long) -> Unit,
) {
    val colors = MusicTheme.colors
    Column {
        credits.forEach { credit ->
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .clip(MaterialTheme.shapes.medium)
                        .clickable { onOpenParty(credit.partyId) }
                        .padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                PartyAvatar(
                    name = credit.name,
                    url = credit.avatarUrl,
                    modifier = Modifier.size(40.dp),
                    initialsSize = 14.sp,
                )
                Column(Modifier.weight(1f)) {
                    Text(
                        text = credit.name,
                        style = MaterialTheme.typography.titleSmall,
                        color = colors.foreground,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = credit.creditType,
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.mutedForeground,
                    )
                }
            }
        }
    }
}

@Composable
private fun AlbumAbout(album: AlbumDetail) {
    val rows =
        listOfNotNull(
            album.releaseDate?.let { "Release date" to formatDate(it) },
            "Type" to album.type,
            "Discs" to album.discs.size.toString(),
            "Tracks" to album.trackCount.toString(),
            formatDurationHoursMinutes(album.totalDurationMs)?.let { "Duration" to it },
        )

    Section("About this album") {
        Column {
            rows.forEach { (label, value) ->
                Row(
                    modifier = Modifier.padding(vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(24.dp),
                ) {
                    Text(
                        text = label,
                        modifier = Modifier.weight(1f),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MusicTheme.colors.mutedForeground,
                    )
                    Text(
                        text = value,
                        style = MaterialTheme.typography.labelMedium.merge(TabularNumbers),
                        color = MusicTheme.colors.foreground,
                    )
                }
            }
        }
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
            style = MaterialTheme.typography.titleLarge,
            color = MusicTheme.colors.foreground,
        )
        content()
    }
}

@Composable
internal fun Eyebrow(text: String) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 0.06.em,
        color = MusicTheme.colors.mutedForeground,
        maxLines = 1,
    )
}
