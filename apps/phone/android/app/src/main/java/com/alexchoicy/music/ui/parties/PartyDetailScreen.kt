package com.alexchoicy.music.ui.parties

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SecondaryScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.alexchoicy.music.R
import com.alexchoicy.music.api.AlbumSummary
import com.alexchoicy.music.api.ExternalLink
import com.alexchoicy.music.api.PartyDetail
import com.alexchoicy.music.api.PartyMember
import com.alexchoicy.music.data.library.searchKey
import com.alexchoicy.music.ui.collection.fullWidthItem
import com.alexchoicy.music.ui.components.AlbumTile
import com.alexchoicy.music.ui.components.ButtonVariant
import com.alexchoicy.music.ui.components.MusicButton
import com.alexchoicy.music.ui.components.EmptyState
import com.alexchoicy.music.ui.components.MusicBottomSheet
import com.alexchoicy.music.ui.components.PartyAvatar
import com.alexchoicy.music.ui.components.PlaceholderBlock
import com.alexchoicy.music.ui.components.SearchField
import com.alexchoicy.music.ui.components.SheetOption
import com.alexchoicy.music.ui.components.Tag
import com.alexchoicy.music.ui.detail.DetailScreen
import com.alexchoicy.music.ui.detail.DetailViewModel
import com.alexchoicy.music.ui.detail.PageInset
import com.alexchoicy.music.ui.detail.fullBleed
import com.alexchoicy.music.ui.musicApplication
import com.alexchoicy.music.ui.plural
import com.alexchoicy.music.ui.theme.MusicTheme
import java.time.Instant

private val AvatarSize = 144.dp
private val HeroButtonPadding = PaddingValues(horizontal = 12.dp)
private val PreviewTileWidth = 150.dp
private const val PREVIEW_ALBUM_COUNT = 10
private const val PREVIEW_MEMBER_COUNT = 5

private val kindLabels = mapOf(
    "VocaloidCreator" to "Vocaloid creator",
    "VoiceSynth" to "Voice synth",
)

private val countryLabels = mapOf(
    "HK" to "Hong Kong",
    "JP" to "Japan",
    "KR" to "South Korea",
    "US" to "United States",
    "CN" to "China",
    "TW" to "Taiwan",
    "ID" to "Indonesia",
    "UK" to "United Kingdom",
)

private val linkLabels = mapOf(
    "OfficialWebsite" to "Official website",
    "YouTubeMusic" to "YouTube Music",
    "AppleMusic" to "Apple Music",
)

private enum class PartyTab(val label: String) {
    Overview("Overview"),
    Albums("Albums"),
    FeaturedIn("Featured in"),
    Members("Members"),
}

private enum class AlbumSort(val label: String) {
    Newest("Newest"),
    Oldest("Oldest"),
    Title("Title A–Z"),
}

private enum class PartySheet { Links, Sort }

@Composable
fun PartyDetailScreen(
    partyId: Long,
    contentPadding: PaddingValues,
    onBack: () -> Unit,
    onOpenAlbum: (Long) -> Unit,
    onOpenParty: (Long) -> Unit,
    viewModel: DetailViewModel<PartyDetail> = viewModel {
        val repository = musicApplication().detailRepository
        DetailViewModel(repository.party(partyId)) { repository.syncParty(partyId) }
    },
) {
    var selectedTab by rememberSaveable { mutableStateOf(PartyTab.Overview) }
    var search by rememberSaveable { mutableStateOf("") }
    var sort by rememberSaveable { mutableStateOf(AlbumSort.Newest) }
    var openSheet by rememberSaveable { mutableStateOf<PartySheet?>(null) }
    val openTab = { tab: PartyTab ->
        if (tab != selectedTab) search = ""
        selectedTab = tab
    }

    DetailScreen(
        viewModel = viewModel,
        noun = "party",
        contentPadding = contentPadding,
        onBack = onBack,
        backdropUrl = { it.avatarUrl },
        backdropAlpha = 0.3f,
        itemSpacing = 0.dp,
        hero = { PartyHero(it, onOpenLinks = { openSheet = PartySheet.Links }) },
        placeholder = { PartyDetailPlaceholder() },
    ) { party ->
        val tabs = party.tabs()
        val tab = selectedTab.takeIf { it in tabs } ?: PartyTab.Overview

        fullWidthItem("tabs") {
            PartyTabs(party, tabs, tab, onSelect = openTab)
        }
        when (tab) {
            PartyTab.Overview -> overview(party, onOpenAlbum, onOpenParty, openTab)
            PartyTab.Albums, PartyTab.FeaturedIn -> albumList(
                albums = if (tab == PartyTab.Albums) party.albums else party.appearsOn,
                search = search,
                onSearchChange = { search = it },
                sort = sort,
                onOpenSort = { openSheet = PartySheet.Sort },
                onOpenAlbum = onOpenAlbum,
            )
            PartyTab.Members -> {
                fullWidthItem("members-spacer") { Spacer(Modifier.height(16.dp)) }
                items(
                    items = party.members,
                    key = { "member-${it.partyId}" },
                    span = { GridItemSpan(maxLineSpan) },
                ) { MemberRow(it, onClick = { onOpenParty(it.partyId) }) }
            }
        }
    }

    val party = viewModel.item
    when (openSheet) {
        PartySheet.Links -> MusicBottomSheet(title = "Links", onDismiss = { openSheet = null }) {
            Column(Modifier.padding(horizontal = 12.dp)) {
                party?.links?.forEach { LinkRow(it) }
            }
        }
        PartySheet.Sort -> MusicBottomSheet(
            title = "Sort by",
            onDismiss = { openSheet = null },
        ) { hide ->
            Column {
                AlbumSort.entries.forEach { option ->
                    SheetOption(label = option.label, selected = option == sort) {
                        sort = option
                        hide()
                    }
                }
            }
        }
        null -> Unit
    }
}

private fun PartyDetail.tabs() = listOfNotNull(
    PartyTab.Overview,
    PartyTab.Albums.takeIf { albums.isNotEmpty() },
    PartyTab.FeaturedIn.takeIf { appearsOn.isNotEmpty() },
    PartyTab.Members.takeIf { members.isNotEmpty() },
)

private fun PartyDetail.count(tab: PartyTab) = when (tab) {
    PartyTab.Overview -> null
    PartyTab.Albums -> albums.size
    PartyTab.FeaturedIn -> appearsOn.size
    PartyTab.Members -> members.size
}

@Composable
private fun PartyTabs(
    party: PartyDetail,
    tabs: List<PartyTab>,
    selected: PartyTab,
    onSelect: (PartyTab) -> Unit,
) {
    val colors = MusicTheme.colors
    val selectedIndex = tabs.indexOf(selected)
    SecondaryScrollableTabRow(
        selectedTabIndex = selectedIndex,
        modifier = Modifier
            .fullBleed()
            .padding(top = 16.dp),
        containerColor = Color.Transparent,
        contentColor = colors.foreground,
        edgePadding = PageInset - 16.dp,
        indicator = {
            TabRowDefaults.SecondaryIndicator(
                modifier = Modifier.tabIndicatorOffset(selectedIndex, matchContentSize = true),
                color = colors.primary,
            )
        },
        divider = { HorizontalDivider(color = colors.border) },
    ) {
        tabs.forEach { tab ->
            Tab(
                selected = tab == selected,
                onClick = { onSelect(tab) },
                selectedContentColor = colors.foreground,
                unselectedContentColor = colors.mutedForeground,
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(tab.label, style = MaterialTheme.typography.labelMedium)
                    party.count(tab)?.let {
                        Text(
                            text = it.toString(),
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.mutedForeground,
                        )
                    }
                }
            }
        }
    }
}

private fun LazyGridScope.overview(
    party: PartyDetail,
    onOpenAlbum: (Long) -> Unit,
    onOpenParty: (Long) -> Unit,
    onOpenTab: (PartyTab) -> Unit,
) {
    if (party.albums.isEmpty() && party.appearsOn.isEmpty() && party.members.isEmpty()) {
        fullWidthItem("overview-empty") {
            EmptyState(
                icon = R.drawable.ic_albums,
                title = "No albums for ${party.name} yet",
                description = "Albums that credit this party will appear here.",
            )
        }
        return
    }
    if (party.albums.isNotEmpty()) {
        fullWidthItem("overview-albums") {
            AlbumPreview("Albums", party.albums, onOpenAlbum) { onOpenTab(PartyTab.Albums) }
        }
    }
    if (party.appearsOn.isNotEmpty()) {
        fullWidthItem("overview-featured") {
            AlbumPreview("Featured in", party.appearsOn, onOpenAlbum) {
                onOpenTab(PartyTab.FeaturedIn)
            }
        }
    }
    if (party.members.isNotEmpty()) {
        fullWidthItem("overview-members") {
            Column(Modifier.padding(top = 32.dp)) {
                SectionHeader(
                    title = "Members",
                    onSeeAll = { onOpenTab(PartyTab.Members) }
                        .takeIf { party.members.size > PREVIEW_MEMBER_COUNT },
                    trailing = plural(party.members.size, "member"),
                )
                party.members.take(PREVIEW_MEMBER_COUNT).forEach {
                    MemberRow(it, onClick = { onOpenParty(it.partyId) })
                }
            }
        }
    }
}

@Composable
private fun AlbumPreview(
    title: String,
    albums: List<AlbumSummary>,
    onOpenAlbum: (Long) -> Unit,
    onSeeAll: () -> Unit,
) {
    Column(
        modifier = Modifier.padding(top = 32.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        SectionHeader(title, onSeeAll)
        LazyRow(
            modifier = Modifier.fullBleed(),
            contentPadding = PaddingValues(horizontal = PageInset),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            items(albums.take(PREVIEW_ALBUM_COUNT), key = { it.id }) { album ->
                AlbumTile(
                    album = album,
                    onClick = { onOpenAlbum(album.id) },
                    modifier = Modifier.width(PreviewTileWidth),
                    showMeta = false,
                )
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String, onSeeAll: (() -> Unit)?, trailing: String? = null) {
    val colors = MusicTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 44.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.titleLarge,
            color = colors.foreground,
        )
        when {
            onSeeAll != null -> Box(
                modifier = Modifier
                    .offset(x = 12.dp)
                    .heightIn(min = 44.dp)
                    .clip(MaterialTheme.shapes.extraSmall)
                    .clickable(onClick = onSeeAll)
                    .padding(horizontal = 12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "See all",
                    style = MaterialTheme.typography.labelMedium,
                    color = colors.foreground,
                )
            }
            trailing != null -> Text(
                text = trailing,
                style = MaterialTheme.typography.bodySmall,
                color = colors.mutedForeground,
            )
        }
    }
}

private fun LazyGridScope.albumList(
    albums: List<AlbumSummary>,
    search: String,
    onSearchChange: (String) -> Unit,
    sort: AlbumSort,
    onOpenSort: () -> Unit,
    onOpenAlbum: (Long) -> Unit,
) {
    val key = searchKey(search)
    val visible = albums
        .filter { album ->
            val names = listOf(album.title) + album.artists.map { it.name }
            key.isEmpty() || names.any { searchKey(it).contains(key) }
        }
        .sortedWith(
            when (sort) {
                AlbumSort.Newest -> compareBy<AlbumSummary, Instant?>(nullsLast(reverseOrder())) {
                    it.releaseDate
                }.thenBy { it.title }
                AlbumSort.Oldest -> compareBy<AlbumSummary, Instant?>(nullsLast()) {
                    it.releaseDate
                }.thenBy { it.title }
                AlbumSort.Title -> compareBy { it.title }
            },
        )

    fullWidthItem("album-tools") {
        Column(
            modifier = Modifier.padding(top = 16.dp, bottom = 4.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            SearchField(
                value = search,
                onValueChange = onSearchChange,
                placeholder = "Search albums",
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = plural(albums.size, "album"),
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.bodySmall,
                    color = MusicTheme.colors.mutedForeground,
                )
                Row(
                    modifier = Modifier
                        .offset(x = 12.dp)
                        .heightIn(min = 44.dp)
                        .clip(MaterialTheme.shapes.extraSmall)
                        .clickable(onClick = onOpenSort)
                        .padding(horizontal = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        painterResource(R.drawable.ic_sort),
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MusicTheme.colors.foreground,
                    )
                    Text(
                        text = sort.label,
                        style = MaterialTheme.typography.labelMedium,
                        color = MusicTheme.colors.foreground,
                    )
                }
            }
        }
    }
    if (visible.isEmpty()) {
        fullWidthItem("album-empty") {
            EmptyState(
                icon = R.drawable.ic_search,
                title = "No matches",
                description = "Try a different search.",
            )
        }
    }
    items(visible, key = { "album-${it.id}" }) { album ->
        AlbumTile(
            album = album,
            onClick = { onOpenAlbum(album.id) },
            modifier = Modifier.padding(top = 8.dp, bottom = 16.dp),
        )
    }
}

@Composable
private fun MemberRow(member: PartyMember, onClick: () -> Unit) {
    ListRow(onClick = onClick) {
        PartyAvatar(
            name = member.name,
            url = member.avatarUrl,
            modifier = Modifier.size(40.dp),
            initialsSize = 14.sp,
        )
        Text(
            text = member.name,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.titleSmall,
            color = MusicTheme.colors.foreground,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun ListRow(onClick: () -> Unit, content: @Composable RowScope.() -> Unit) {
    Row(
        modifier = Modifier
            .fullBleed()
            .clickable(onClick = onClick)
            .padding(horizontal = PageInset, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        content()
        Icon(
            painterResource(R.drawable.ic_chevron_right),
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = MusicTheme.colors.mutedForeground,
        )
    }
}

@Composable
private fun ColumnScope.PartyHero(party: PartyDetail, onOpenLinks: () -> Unit) {
    val colors = MusicTheme.colors
    val details = listOfNotNull(
        kindLabels[party.kind] ?: party.kind,
        party.gender?.takeIf { it != "Unknown" },
        countryLabels[party.country],
    )
    var descriptionExpanded by rememberSaveable { mutableStateOf(false) }

    Spacer(Modifier.height(8.dp))
    PartyAvatar(
        name = party.name,
        url = party.avatarUrl,
        modifier = Modifier
            .size(AvatarSize)
            .align(Alignment.CenterHorizontally),
        initialsSize = 40.sp,
    )
    Spacer(Modifier.height(24.dp))
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            party.type?.let { Tag(it) }
            details.forEach { Tag(it, outlined = true) }
        }
        Text(
            text = party.name,
            style = MaterialTheme.typography.headlineLarge,
            color = colors.foreground,
            textAlign = TextAlign.Center,
        )
        if (party.aliases.isNotEmpty()) {
            Text(
                text = "Also known as ${party.aliases.joinToString(", ")}",
                style = MaterialTheme.typography.bodySmall,
                color = colors.mutedForeground,
                textAlign = TextAlign.Center,
            )
        }
        if (party.description.isNotEmpty()) {
            Text(
                text = party.description,
                modifier = Modifier
                    .clip(MaterialTheme.shapes.extraSmall)
                    .clickable { descriptionExpanded = !descriptionExpanded },
                style = MaterialTheme.typography.bodyMedium.copy(lineHeight = 22.sp),
                color = colors.mutedForeground,
                textAlign = TextAlign.Center,
                maxLines = if (descriptionExpanded) Int.MAX_VALUE else 3,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            MusicButton(
                text = "Play",
                onClick = {},
                modifier = Modifier.weight(1f),
                icon = R.drawable.ic_play,
                contentPadding = HeroButtonPadding,
            )
            MusicButton(
                text = "Shuffle",
                onClick = {},
                modifier = Modifier.weight(1f),
                variant = ButtonVariant.Secondary,
                icon = R.drawable.ic_shuffle,
                contentPadding = HeroButtonPadding,
            )
            if (party.links.isNotEmpty()) {
                MusicButton(
                    text = "Links",
                    onClick = onOpenLinks,
                    variant = ButtonVariant.Outline,
                    contentPadding = HeroButtonPadding,
                )
            }
        }
    }
}

@Composable
private fun LinkRow(link: ExternalLink) {
    val uriHandler = LocalUriHandler.current
    val colors = MusicTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.medium)
            .clickable { runCatching { uriHandler.openUri(link.url) } }
            .heightIn(min = 48.dp)
            .padding(horizontal = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = linkLabels[link.type] ?: link.type,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.labelLarge,
            color = colors.foreground,
        )
        Icon(
            painterResource(R.drawable.ic_external_link),
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = colors.mutedForeground,
        )
    }
}

@Composable
private fun PartyDetailPlaceholder() {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Spacer(Modifier.height(8.dp))
        Box(
            Modifier
                .size(AvatarSize)
                .background(MusicTheme.colors.muted, CircleShape),
        )
        Spacer(Modifier.height(12.dp))
        PlaceholderBlock(Modifier.size(72.dp, 20.dp))
        PlaceholderBlock(Modifier.size(200.dp, 30.dp))
        PlaceholderBlock(Modifier.size(160.dp, 14.dp))
    }
}
