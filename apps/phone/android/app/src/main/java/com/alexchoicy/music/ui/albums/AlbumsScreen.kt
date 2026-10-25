package com.alexchoicy.music.ui.albums

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.alexchoicy.music.R
import com.alexchoicy.music.api.AlbumType
import com.alexchoicy.music.ui.collection.CollectionCopy
import com.alexchoicy.music.ui.collection.CollectionScreen
import com.alexchoicy.music.ui.collection.DownloadedSection
import com.alexchoicy.music.ui.components.AlbumPlaceholder
import com.alexchoicy.music.ui.components.AlbumTile
import com.alexchoicy.music.ui.components.FilterChip
import com.alexchoicy.music.ui.components.SheetSection
import com.alexchoicy.music.ui.musicApplication
import com.alexchoicy.music.ui.theme.MusicTheme

private val AlbumsCopy =
    CollectionCopy(
        title = "Albums",
        searchPlaceholder = "Search albums",
        icon = R.drawable.ic_albums,
        emptyTitle = "No albums yet",
    )

@Composable
fun AlbumsScreen(
    contentPadding: PaddingValues,
    onOpenAlbum: (Long) -> Unit,
    viewModel: AlbumsViewModel =
        viewModel {
            AlbumsViewModel(musicApplication().libraryRepository, musicApplication().network)
        },
) {
    val loader = viewModel.albums
    val query = loader.query

    CollectionScreen(
        loader = loader,
        copy = AlbumsCopy,
        contentPadding = contentPadding,
        minTileWidth = 150.dp,
        search = query.search,
        onSearchChange = { loader.query = query.copy(search = it) },
        sort = query.sort,
        onSortChange = { loader.query = query.copy(sort = it) },
        filterCount = query.types.size + query.languageIds.size + if (query.downloaded) 1 else 0,
        onResetFilters = {
            loader.query = query.copy(types = emptySet(), languageIds = emptySet(), downloaded = false)
        },
        key = { it.id },
        tile = { AlbumTile(it, onClick = { onOpenAlbum(it.id) }, Modifier.fillMaxWidth()) },
        placeholderTile = { AlbumPlaceholder() },
    ) {
        DownloadedSection(
            selected = query.downloaded,
            onSelectedChange = { loader.query = query.copy(downloaded = it) },
        )
        SheetSection("Type") {
            AlbumType.entries.forEach { type ->
                FilterChip(
                    label = type.name,
                    selected = type in query.types,
                    onSelectedChange = { selected ->
                        loader.query =
                            query.copy(
                                types = if (selected) query.types + type else query.types - type,
                            )
                    },
                )
            }
        }
        LanguageSection(
            viewModel = viewModel,
            selected = query.languageIds,
            onSelectedChange = { loader.query = query.copy(languageIds = it) },
        )
    }
}

@Composable
private fun LanguageSection(
    viewModel: AlbumsViewModel,
    selected: Set<Long>,
    onSelectedChange: (Set<Long>) -> Unit,
) {
    val languages = viewModel.languages
    val loader = viewModel.albums

    SheetSection("Language") {
        when {
            languages.isNotEmpty() ->
                languages.forEach { language ->
                    FilterChip(
                        label = language.name,
                        selected = language.id in selected,
                        onSelectedChange = { on ->
                            onSelectedChange(if (on) selected + language.id else selected - language.id)
                        },
                    )
                }
            loader.syncing -> SheetMessage("Loading…")
            loader.failed ->
                FilterChip(
                    label = "Couldn't load languages. Retry",
                    selected = false,
                    onSelectedChange = { loader.refresh() },
                )
            else -> SheetMessage("No languages yet")
        }
    }
}

@Composable
private fun SheetMessage(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.bodyMedium,
        color = MusicTheme.colors.mutedForeground,
    )
}
