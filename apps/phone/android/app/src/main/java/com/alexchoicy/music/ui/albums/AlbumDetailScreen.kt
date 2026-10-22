package com.alexchoicy.music.ui.albums

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.TextStyle
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
import com.alexchoicy.music.ui.collection.fullWidthItem
import com.alexchoicy.music.ui.components.Artwork
import com.alexchoicy.music.ui.components.PartyAvatar
import com.alexchoicy.music.ui.components.PlaceholderBlock
import com.alexchoicy.music.ui.components.Tag
import com.alexchoicy.music.ui.detail.DetailScreen
import com.alexchoicy.music.ui.detail.DetailViewModel
import com.alexchoicy.music.ui.formatDate
import com.alexchoicy.music.ui.formatDurationHoursMinutes
import com.alexchoicy.music.ui.formatPlaybackTime
import com.alexchoicy.music.ui.musicApplication
import com.alexchoicy.music.ui.plural
import com.alexchoicy.music.ui.theme.MusicTheme

private val CoverSize = 200.dp
private val TabularNumbers = TextStyle(fontFeatureSettings = "tnum")

@Composable
fun AlbumDetailScreen(
    albumId: Long,
    contentPadding: PaddingValues,
    onBack: () -> Unit,
    onOpenParty: (Long) -> Unit,
    viewModel: DetailViewModel<AlbumDetail> = viewModel {
        val repository = musicApplication().detailRepository
        DetailViewModel(repository.album(albumId)) { repository.syncAlbum(albumId) }
    },
) {
    DetailScreen(
        viewModel = viewModel,
        noun = "album",
        contentPadding = contentPadding,
        onBack = onBack,
        backdropUrl = { it.coverUrl },
        backdropAlpha = 0.5f,
        itemSpacing = 32.dp,
        hero = { AlbumHero(it, onOpenParty) },
        placeholder = { AlbumDetailPlaceholder() },
    ) { album ->
        fullWidthItem("tracks") { TrackList(album) }
        fullWidthItem("credits") { AlbumCredits(album, onOpenParty) }
        fullWidthItem("about") { AlbumAbout(album) }
    }
}

@Composable
private fun ColumnScope.AlbumHero(album: AlbumDetail, onOpenParty: (Long) -> Unit) {
    val colors = MusicTheme.colors
    val meta = listOfNotNull(
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
        modifier = Modifier
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
            style = MaterialTheme.typography.headlineLarge,
            color = colors.foreground,
            textAlign = TextAlign.Center,
        )
        Text(
            text = if (artists.isEmpty()) {
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
    AlbumActions()
}

@Composable
private fun AlbumActions() {
    val colors = MusicTheme.colors
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = {}, modifier = Modifier.offset(x = (-12).dp)) {
            Icon(
                painterResource(R.drawable.ic_download),
                contentDescription = "Download album",
                modifier = Modifier.size(22.dp),
                tint = colors.foreground,
            )
        }
        Spacer(Modifier.weight(1f))
        IconButton(onClick = {}) {
            Icon(
                painterResource(R.drawable.ic_shuffle),
                contentDescription = "Shuffle",
                modifier = Modifier.size(22.dp),
                tint = colors.foreground,
            )
        }
        Spacer(Modifier.width(8.dp))
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(CircleShape)
                .background(colors.primary)
                .clickable(onClickLabel = "Play album", onClick = {}),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                painterResource(R.drawable.ic_play),
                contentDescription = "Play album",
                modifier = Modifier
                    .size(24.dp)
                    .offset(x = 1.dp),
                tint = colors.primaryForeground,
            )
        }
    }
}

@Composable
private fun TrackList(album: AlbumDetail) {
    val showDiscBands = album.discs.size > 1
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        album.discs.forEach { disc ->
            Column {
                if (showDiscBands) DiscBand(disc)
                disc.tracks.forEach { TrackRow(it) }
            }
        }
    }
}

@Composable
private fun DiscBand(disc: AlbumDisc) {
    val colors = MusicTheme.colors
    val meta = listOfNotNull(
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
private fun TrackRow(track: AlbumTrack) {
    val colors = MusicTheme.colors
    val badges = listOfNotNull(
        track.versionType.takeIf { it != "Original" },
        track.contentType.takeIf { it != "Music" }?.let { if (it == "MC") "Talk" else it },
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = track.trackNumber.toString(),
            modifier = Modifier.widthIn(min = 24.dp),
            style = MaterialTheme.typography.labelMedium.merge(TabularNumbers),
            color = colors.mutedForeground,
        )
        Column(Modifier.weight(1f)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = track.title,
                    modifier = Modifier.weight(1f, fill = false),
                    style = MaterialTheme.typography.titleSmall,
                    color = colors.foreground,
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
        Text(
            text = formatPlaybackTime(track.durationMs),
            style = MaterialTheme.typography.labelSmall.merge(TabularNumbers),
            color = colors.mutedForeground,
        )
    }
}

@Composable
private fun AlbumCredits(album: AlbumDetail, onOpenParty: (Long) -> Unit) {
    val albumCreditKeys = album.credits.map { it.partyId to it.creditType }.toSet()
    val trackCredits = album.discs
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
private fun CreditList(credits: List<Credit>, onOpenParty: (Long) -> Unit) {
    val colors = MusicTheme.colors
    Column {
        credits.forEach { credit ->
            Row(
                modifier = Modifier
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
    val rows = listOfNotNull(
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
private fun Section(title: String, content: @Composable ColumnScope.() -> Unit) {
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
private fun Eyebrow(text: String) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 0.06.em,
        color = MusicTheme.colors.mutedForeground,
        maxLines = 1,
    )
}

@Composable
private fun AlbumDetailPlaceholder() {
    Column(verticalArrangement = Arrangement.spacedBy(32.dp)) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Spacer(Modifier.height(8.dp))
            Box(
                Modifier
                    .size(CoverSize)
                    .background(MusicTheme.colors.muted, MaterialTheme.shapes.extraLarge),
            )
            Spacer(Modifier.height(12.dp))
            PlaceholderBlock(Modifier.size(56.dp, 12.dp))
            PlaceholderBlock(Modifier.size(220.dp, 30.dp))
            PlaceholderBlock(Modifier.size(140.dp, 16.dp))
        }
        Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
            repeat(6) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    PlaceholderBlock(Modifier.size(16.dp, 12.dp))
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        PlaceholderBlock(Modifier.size(160.dp, 14.dp))
                        PlaceholderBlock(Modifier.size(96.dp, 12.dp))
                    }
                    PlaceholderBlock(Modifier.size(36.dp, 12.dp))
                }
            }
        }
    }
}
