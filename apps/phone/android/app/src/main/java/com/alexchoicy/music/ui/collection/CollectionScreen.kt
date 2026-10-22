package com.alexchoicy.music.ui.collection

import androidx.annotation.DrawableRes
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.R
import com.alexchoicy.music.api.ListSort
import com.alexchoicy.music.ui.components.ButtonVariant
import com.alexchoicy.music.ui.components.EmptyState
import com.alexchoicy.music.ui.components.MusicBottomSheet
import com.alexchoicy.music.ui.components.MusicButton
import com.alexchoicy.music.ui.components.MusicSnackbarHost
import com.alexchoicy.music.ui.components.SearchField
import com.alexchoicy.music.ui.components.SheetOption
import com.alexchoicy.music.ui.theme.MusicTheme

private val PageInset = 24.dp
private const val PLACEHOLDER_COUNT = 9

private val ListSort.label
    get() = when (this) {
        ListSort.TitleAsc -> "Title A–Z"
        ListSort.TitleDesc -> "Title Z–A"
        ListSort.CreatedAtDesc -> "Recently added"
        ListSort.CreatedAtAsc -> "Oldest added"
    }

class CollectionCopy(
    val title: String,
    val searchPlaceholder: String,
    @param:DrawableRes val icon: Int,
    val emptyTitle: String,
    val emptyDescription: String,
)

@Composable
fun <Q, T> CollectionScreen(
    loader: CollectionLoader<Q, T>,
    copy: CollectionCopy,
    contentPadding: PaddingValues,
    minTileWidth: Dp,
    search: String,
    onSearchChange: (String) -> Unit,
    sort: ListSort,
    onSortChange: (ListSort) -> Unit,
    filterCount: Int,
    onResetFilters: () -> Unit,
    key: (T) -> Any,
    tile: @Composable (T) -> Unit,
    placeholderTile: @Composable () -> Unit,
    filters: @Composable ColumnScope.() -> Unit,
) {
    val items = loader.items
    val filtered = search.isNotBlank() || filterCount > 0
    var openSheet by rememberSaveable { mutableStateOf<CollectionSheet?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }
    val showRefreshError = loader.failed && items != null

    LaunchedEffect(showRefreshError) {
        if (!showRefreshError) return@LaunchedEffect
        val result = snackbarHostState.showSnackbar(
            message = "Couldn't refresh ${copy.title.lowercase()}",
            actionLabel = "Retry",
            duration = SnackbarDuration.Indefinite,
            withDismissAction = true,
        )
        if (result == SnackbarResult.ActionPerformed) loader.refresh()
    }

    PullToRefreshBox(
        isRefreshing = loader.refreshing,
        onRefresh = loader::refresh,
        modifier = Modifier
            .fillMaxSize()
            .padding(top = contentPadding.calculateTopPadding()),
    ) {
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minTileWidth),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                start = PageInset,
                top = PageInset,
                end = PageInset,
                bottom = contentPadding.calculateBottomPadding() + PageInset,
            ),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            fullWidthItem("header") {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = copy.title,
                            modifier = Modifier.weight(1f),
                            style = MaterialTheme.typography.headlineLarge,
                            color = MusicTheme.colors.foreground,
                        )
                        FilterButton(filterCount) { openSheet = CollectionSheet.Filter }
                        HeaderButton(R.drawable.ic_sort, "Sort, ${sort.label}") {
                            openSheet = CollectionSheet.Sort
                        }
                    }
                    SearchField(
                        value = search,
                        onValueChange = onSearchChange,
                        placeholder = copy.searchPlaceholder,
                    )
                }
            }
            when {
                items != null && items.isEmpty() -> fullWidthItem {
                    EmptyState(
                        icon = if (filtered) R.drawable.ic_search else copy.icon,
                        title = if (filtered) "No matches" else copy.emptyTitle,
                        description = if (filtered) {
                            "Try a different search or filter."
                        } else {
                            copy.emptyDescription
                        },
                    )
                }
                items != null -> items(items, key = key) { tile(it) }
                loader.failed -> fullWidthItem {
                    EmptyState(
                        icon = R.drawable.ic_cloud_off,
                        title = "Couldn't load ${copy.title.lowercase()}",
                        description = "Check your connection to the server, then try again.",
                        action = {
                            MusicButton(
                                text = "Try again",
                                onClick = loader::refresh,
                                variant = ButtonVariant.Ghost,
                            )
                        },
                    )
                }
                else -> items(PLACEHOLDER_COUNT) { placeholderTile() }
            }
        }
        MusicSnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = contentPadding.calculateBottomPadding()),
        )
    }

    when (openSheet) {
        CollectionSheet.Filter -> MusicBottomSheet(
            title = "Filter ${copy.title.lowercase()}",
            onDismiss = { openSheet = null },
            footer = { hide ->
                MusicButton(
                    text = "Reset",
                    onClick = onResetFilters,
                    modifier = Modifier.weight(1f),
                    variant = ButtonVariant.Ghost,
                    enabled = filterCount > 0,
                )
                MusicButton(text = "Done", onClick = hide, modifier = Modifier.weight(1f))
            },
        ) { filters() }
        CollectionSheet.Sort -> MusicBottomSheet(
            title = "Sort by",
            onDismiss = { openSheet = null },
        ) { hide ->
            Column {
                ListSort.entries.forEach { option ->
                    SheetOption(label = option.label, selected = option == sort) {
                        onSortChange(option)
                        hide()
                    }
                }
            }
        }
        null -> Unit
    }
}

private enum class CollectionSheet { Filter, Sort }

internal fun LazyGridScope.fullWidthItem(key: Any? = null, content: @Composable () -> Unit) =
    item(key = key, span = { GridItemSpan(maxLineSpan) }) { content() }

@Composable
private fun HeaderButton(@DrawableRes icon: Int, label: String, onClick: () -> Unit) {
    IconButton(onClick = onClick) {
        Icon(
            painterResource(icon),
            contentDescription = label,
            modifier = Modifier.size(20.dp),
            tint = MusicTheme.colors.foreground,
        )
    }
}

@Composable
private fun FilterButton(count: Int, onClick: () -> Unit) {
    val colors = MusicTheme.colors
    BadgedBox(
        badge = {
            if (count > 0) {
                Badge(
                    modifier = Modifier.offset(x = (-8).dp, y = 8.dp),
                    containerColor = colors.primary,
                    contentColor = colors.primaryForeground,
                ) { Text(count.toString()) }
            }
        },
    ) {
        HeaderButton(R.drawable.ic_filter, if (count > 0) "Filters, $count on" else "Filters", onClick)
    }
}
