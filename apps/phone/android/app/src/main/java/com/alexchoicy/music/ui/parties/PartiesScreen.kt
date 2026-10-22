package com.alexchoicy.music.ui.parties

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.alexchoicy.music.R
import com.alexchoicy.music.api.PartyType
import com.alexchoicy.music.ui.collection.CollectionCopy
import com.alexchoicy.music.ui.collection.CollectionScreen
import com.alexchoicy.music.ui.components.FilterChip
import com.alexchoicy.music.ui.components.PartyArtworkMaxSize
import com.alexchoicy.music.ui.components.PartyTile
import com.alexchoicy.music.ui.components.PlaceholderBlock
import com.alexchoicy.music.ui.components.SheetSection
import com.alexchoicy.music.ui.musicApplication
import com.alexchoicy.music.ui.theme.MusicTheme

private val PartiesCopy = CollectionCopy(
    title = "Parties",
    searchPlaceholder = "Search parties",
    icon = R.drawable.ic_parties,
    emptyTitle = "No parties yet",
    emptyDescription = "Artists, groups, and projects with releases will appear here.",
)

@Composable
fun PartiesScreen(
    contentPadding: PaddingValues,
    onOpenParty: (Long) -> Unit,
    viewModel: PartiesViewModel = viewModel {
        PartiesViewModel(musicApplication().libraryRepository)
    },
) {
    val loader = viewModel.parties
    val query = loader.query

    CollectionScreen(
        loader = loader,
        copy = PartiesCopy,
        contentPadding = contentPadding,
        minTileWidth = 96.dp,
        search = query.search,
        onSearchChange = { loader.query = query.copy(search = it) },
        sort = query.sort,
        onSortChange = { loader.query = query.copy(sort = it) },
        filterCount = if (query.type != null) 1 else 0,
        onResetFilters = { loader.query = query.copy(type = null) },
        key = { it.id },
        tile = { PartyTile(it, onClick = { onOpenParty(it.id) }, Modifier.fillMaxWidth()) },
        placeholderTile = { PartyPlaceholder() },
    ) {
        SheetSection("Type") {
            PartyType.entries.forEach { type ->
                FilterChip(
                    label = type.name,
                    selected = type == query.type,
                    onSelectedChange = { selected ->
                        loader.query = query.copy(type = if (selected) type else null)
                    },
                )
            }
        }
    }
}

@Composable
private fun PartyPlaceholder() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            Modifier
                .widthIn(max = PartyArtworkMaxSize)
                .fillMaxWidth()
                .aspectRatio(1f)
                .background(MusicTheme.colors.muted, CircleShape),
        )
        PlaceholderBlock(Modifier.size(72.dp, 14.dp))
        PlaceholderBlock(Modifier.size(56.dp, 12.dp))
    }
}
