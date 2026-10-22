package com.alexchoicy.music.ui.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.layout
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.alexchoicy.music.R
import com.alexchoicy.music.ui.collection.fullWidthItem
import com.alexchoicy.music.ui.components.ButtonVariant
import com.alexchoicy.music.ui.components.EmptyState
import com.alexchoicy.music.ui.components.MusicButton
import com.alexchoicy.music.ui.components.MusicSnackbarHost
import com.alexchoicy.music.ui.theme.MusicTheme

internal val PageInset = 24.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun <T : Any> DetailScreen(
    viewModel: DetailViewModel<T>,
    noun: String,
    contentPadding: PaddingValues,
    onBack: () -> Unit,
    backdropUrl: (T) -> String?,
    backdropAlpha: Float,
    itemSpacing: Dp,
    hero: @Composable ColumnScope.(T) -> Unit,
    placeholder: @Composable () -> Unit,
    content: LazyGridScope.(T) -> Unit,
) {
    val item = viewModel.item
    val topInset = contentPadding.calculateTopPadding()
    val snackbarHostState = remember { SnackbarHostState() }
    val pullState = rememberPullToRefreshState()
    val showRefreshError = viewModel.failed && item != null

    LaunchedEffect(showRefreshError) {
        if (!showRefreshError) return@LaunchedEffect
        val result = snackbarHostState.showSnackbar(
            message = "Couldn't refresh $noun",
            actionLabel = "Retry",
            duration = SnackbarDuration.Indefinite,
            withDismissAction = true,
        )
        if (result == SnackbarResult.ActionPerformed) viewModel.refresh()
    }

    PullToRefreshBox(
        isRefreshing = viewModel.refreshing,
        onRefresh = viewModel::refresh,
        modifier = Modifier.fillMaxSize(),
        state = pullState,
        indicator = {
            PullToRefreshDefaults.Indicator(
                state = pullState,
                isRefreshing = viewModel.refreshing,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = topInset),
            )
        },
    ) {
        LazyVerticalGrid(
            columns = GridCells.Adaptive(150.dp),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                start = PageInset,
                top = topInset,
                end = PageInset,
                bottom = contentPadding.calculateBottomPadding() + PageInset,
            ),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(itemSpacing),
        ) {
            fullWidthItem("hero") {
                Box {
                    if (item != null) {
                        Backdrop(
                            url = backdropUrl(item),
                            alpha = backdropAlpha,
                            topInset = topInset,
                            modifier = Modifier.matchParentSize(),
                        )
                    }
                    Column(Modifier.padding(bottom = 8.dp)) {
                        IconButton(onClick = onBack, modifier = Modifier.offset(x = (-12).dp)) {
                            Icon(
                                painterResource(R.drawable.ic_arrow_left),
                                contentDescription = "Back",
                                modifier = Modifier.size(20.dp),
                                tint = MusicTheme.colors.foreground,
                            )
                        }
                        if (item != null) hero(item)
                    }
                }
            }
            when {
                item != null -> content(item)
                viewModel.failed -> fullWidthItem {
                    EmptyState(
                        icon = R.drawable.ic_cloud_off,
                        title = "Couldn't load $noun",
                        description = "Check your connection to the server, then try again.",
                        action = {
                            MusicButton(
                                text = "Try again",
                                onClick = viewModel::refresh,
                                variant = ButtonVariant.Ghost,
                            )
                        },
                    )
                }
                else -> fullWidthItem { placeholder() }
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

@Composable
private fun Backdrop(url: String?, alpha: Float, topInset: Dp, modifier: Modifier) {
    val colors = MusicTheme.colors
    Box(
        modifier.layout { measurable, constraints ->
            val inset = PageInset.roundToPx()
            val top = topInset.roundToPx()
            val placeable = measurable.measure(
                Constraints.fixed(constraints.maxWidth + inset * 2, constraints.maxHeight + top),
            )
            layout(constraints.maxWidth, constraints.maxHeight) { placeable.place(-inset, -top) }
        },
    ) {
        if (url != null) {
            AsyncImage(
                model = url,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxSize()
                    .blur(64.dp),
                contentScale = ContentScale.Crop,
                alpha = alpha,
            )
        }
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        0f to colors.background.copy(alpha = 0.2f),
                        0.8f to colors.artFade,
                        1f to colors.background,
                    ),
                ),
        )
    }
}

internal fun Modifier.fullBleed() = layout { measurable, constraints ->
    val inset = PageInset.roundToPx()
    val width = constraints.maxWidth + inset * 2
    val placeable = measurable.measure(constraints.copy(minWidth = width, maxWidth = width))
    layout(constraints.maxWidth, placeable.height) { placeable.place(-inset, 0) }
}
