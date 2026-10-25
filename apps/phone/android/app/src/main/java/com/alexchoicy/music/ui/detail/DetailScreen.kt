package com.alexchoicy.music.ui.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.layout
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
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
import com.alexchoicy.music.ui.theme.PageInset

private val TopBarHeight = 56.dp
private val BarFadeDistance = 64.dp

@Composable
fun <T : Any> DetailScreen(
    viewModel: DetailViewModel<T>,
    noun: String,
    contentPadding: PaddingValues,
    onBack: () -> Unit,
    title: (T) -> String,
    backdropUrl: (T) -> String?,
    backdropAlpha: Float,
    itemSpacing: Dp,
    hero: @Composable ColumnScope.(item: T, titleModifier: Modifier) -> Unit,
    actions: @Composable RowScope.(T) -> Unit = {},
    content: LazyGridScope.(T) -> Unit,
) {
    val item = viewModel.item
    val statusInset = contentPadding.calculateTopPadding()
    val topInset = statusInset + TopBarHeight
    val barFadeDistance = with(LocalDensity.current) { BarFadeDistance.toPx() }
    var barBottom by remember { mutableFloatStateOf(Float.NaN) }
    var heroTitleTop by remember { mutableFloatStateOf(Float.NaN) }
    var heroTitleHeight by remember { mutableFloatStateOf(Float.NaN) }
    val titleModifier =
        Modifier.onGloballyPositioned {
            heroTitleTop = it.positionInRoot().y
            heroTitleHeight = it.size.height.toFloat()
        }
    val snackbarHostState = remember { SnackbarHostState() }
    val pullState = rememberPullToRefreshState()
    val showRefreshError = viewModel.failed && item != null

    LaunchedEffect(showRefreshError) {
        if (!showRefreshError) return@LaunchedEffect
        val result =
            snackbarHostState.showSnackbar(
                message = "Couldn't refresh $noun",
                actionLabel = "Retry",
                duration = SnackbarDuration.Short,
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
                modifier =
                    Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = topInset),
            )
        },
    ) {
        LazyVerticalGrid(
            columns = GridCells.Adaptive(150.dp),
            modifier = Modifier.fillMaxSize(),
            contentPadding =
                PaddingValues(
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
                        if (item != null) hero(item, titleModifier)
                    }
                }
            }
            when {
                item != null -> content(item)
                viewModel.failed ->
                    fullWidthItem {
                        EmptyState(
                            icon = R.drawable.ic_cloud_off,
                            title = "Couldn't load $noun",
                            action = {
                                MusicButton(
                                    text = "Try again",
                                    onClick = viewModel::refresh,
                                    variant = ButtonVariant.Ghost,
                                )
                            },
                        )
                    }
            }
        }
        Box(
            Modifier
                .fillMaxWidth()
                .onGloballyPositioned { barBottom = it.positionInRoot().y + it.size.height },
        ) {
            Box(
                Modifier
                    .matchParentSize()
                    .graphicsLayer {
                        alpha = reveal(barBottom + barFadeDistance - heroTitleTop, barFadeDistance)
                    }.background(MusicTheme.colors.background),
            )
            Row(
                modifier =
                    Modifier
                        .padding(top = statusInset)
                        .height(TopBarHeight)
                        .padding(horizontal = PageInset - 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack) {
                    Icon(
                        painterResource(R.drawable.ic_arrow_left),
                        contentDescription = "Back",
                        modifier = Modifier.size(20.dp),
                        tint = MusicTheme.colors.foreground,
                    )
                }
                Text(
                    text = item?.let(title).orEmpty(),
                    modifier =
                        Modifier
                            .weight(1f)
                            .padding(horizontal = 8.dp)
                            .graphicsLayer {
                                alpha = reveal(barBottom - heroTitleTop, heroTitleHeight)
                            },
                    style = MaterialTheme.typography.titleMedium,
                    color = MusicTheme.colors.foreground,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Row(
                    modifier = Modifier.width(48.dp),
                    horizontalArrangement = Arrangement.End,
                ) {
                    if (item != null) actions(item)
                }
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

private fun reveal(
    distance: Float,
    range: Float,
) = if (distance.isNaN() || range.isNaN()) 0f else (distance / range).coerceIn(0f, 1f)

@Composable
private fun Backdrop(
    url: String?,
    alpha: Float,
    topInset: Dp,
    modifier: Modifier,
) {
    val colors = MusicTheme.colors
    Box(
        modifier.layout { measurable, constraints ->
            val inset = PageInset.roundToPx()
            val top = topInset.roundToPx()
            val placeable =
                measurable.measure(
                    Constraints.fixed(constraints.maxWidth + inset * 2, constraints.maxHeight + top),
                )
            layout(constraints.maxWidth, constraints.maxHeight) { placeable.place(-inset, -top) }
        },
    ) {
        if (url != null) {
            AsyncImage(
                model = url,
                contentDescription = null,
                modifier =
                    Modifier
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

internal fun Modifier.fullBleed() =
    layout { measurable, constraints ->
        val inset = PageInset.roundToPx()
        val width = constraints.maxWidth + inset * 2
        val placeable = measurable.measure(constraints.copy(minWidth = width, maxWidth = width))
        layout(constraints.maxWidth, placeable.height) { placeable.place(-inset, 0) }
    }
