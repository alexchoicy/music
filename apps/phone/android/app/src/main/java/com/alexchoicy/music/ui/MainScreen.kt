package com.alexchoicy.music.ui

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.navigation3.rememberViewModelStoreNavEntryDecorator
import androidx.navigation3.runtime.NavBackStack
import androidx.navigation3.runtime.NavEntry
import androidx.navigation3.runtime.NavEntryDecorator
import androidx.navigation3.runtime.NavKey
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberDecoratedNavEntries
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.runtime.rememberSaveableStateHolderNavEntryDecorator
import androidx.navigation3.scene.Scene
import androidx.navigation3.ui.NavDisplay
import com.alexchoicy.music.ui.albums.AlbumDetailScreen
import com.alexchoicy.music.ui.albums.AlbumsScreen
import com.alexchoicy.music.ui.components.MainTab
import com.alexchoicy.music.ui.components.MusicBottomNav
import com.alexchoicy.music.ui.components.MusicSnackbarHost
import com.alexchoicy.music.ui.home.HomeScreen
import com.alexchoicy.music.ui.parties.PartiesScreen
import com.alexchoicy.music.ui.parties.PartyDetailScreen
import com.alexchoicy.music.ui.player.LocalPlayer
import com.alexchoicy.music.ui.player.MiniPlayerSpace
import com.alexchoicy.music.ui.player.PlayerSheet
import com.alexchoicy.music.ui.player.ProvidePlayer
import com.alexchoicy.music.ui.player.rememberPlayerSheetState
import com.alexchoicy.music.ui.playlists.PlaylistDetailScreen
import com.alexchoicy.music.ui.playlists.PlaylistsScreen
import com.alexchoicy.music.ui.search.SearchScreen
import com.alexchoicy.music.ui.settings.DownloadsScreen
import com.alexchoicy.music.ui.settings.SettingsScreen
import com.alexchoicy.music.ui.theme.MusicTheme
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.serialization.Serializable

@Serializable
private data class TabRoute(
    val tab: MainTab,
) : NavKey

@Serializable
private data class AlbumRoute(
    val albumId: Long,
) : NavKey

@Serializable
private data class PartyRoute(
    val partyId: Long,
) : NavKey

@Serializable
private data class PlaylistRoute(
    val playlistId: Long,
) : NavKey

@Serializable
private data object SettingsRoute : NavKey

@Serializable
private data object DownloadsRoute : NavKey

private val LocalContentPadding = compositionLocalOf { PaddingValues() }

private const val TAB_TRANSITION_MS = 150

private fun Scene<*>.rootKey() = (previousEntries.firstOrNull() ?: entries.first()).contentKey

private fun AnimatedContentTransitionScope<Scene<NavKey>>.tabSwitch(): ContentTransform? =
    if (initialState.rootKey() != targetState.rootKey()) {
        fadeIn(tween(TAB_TRANSITION_MS)) togetherWith fadeOut(tween(TAB_TRANSITION_MS))
    } else {
        null
    }

private fun AnimatedContentTransitionScope<Scene<NavKey>>.pageTransition() =
    tabSwitch()
        ?: (EnterTransition.None togetherWith ExitTransition.None)

@Composable
fun MainScreen() {
    var tab by rememberSaveable { mutableStateOf(MainTab.Home) }
    val background = MusicTheme.colors.background
    val opaquePage =
        remember(background) {
            NavEntryDecorator<NavKey> { entry ->
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(background),
                ) { entry.Content() }
            }
        }
    val reselects = remember { MutableSharedFlow<MainTab>(extraBufferCapacity = 1) }
    val stacks = MainTab.entries.associateWith { rememberNavBackStack(TabRoute(it)) }
    val entries =
        MainTab.entries.associateWith { root ->
            val backStack = stacks.getValue(root)
            rememberDecoratedNavEntries(
                backStack = backStack,
                entryDecorators =
                    listOf(
                        rememberSaveableStateHolderNavEntryDecorator(),
                        rememberViewModelStoreNavEntryDecorator(),
                        opaquePage,
                    ),
                entryProvider = mainEntries(backStack, reselects) { tab = it },
            )
        }
    val backStack = stacks.getValue(tab)
    val sheet = rememberPlayerSheetState()
    val density = LocalDensity.current
    var bottomBarHeight by remember { mutableStateOf(0.dp) }
    val snackbarHostState = remember { SnackbarHostState() }
    val notices = currentMusicApplication().notices

    LaunchedEffect(notices) {
        notices.messages.collect { snackbarHostState.showSnackbar(it, withDismissAction = true) }
    }

    ProvidePlayer {
        val player = LocalPlayer.current
        Box(Modifier.fillMaxSize()) {
            MainScaffold(
                tab = tab,
                backStack = backStack,
                entries = entries.getValue(tab),
                reserveMiniPlayer = player.current != null,
                onSelectTab = { tab = it },
                onReselectRoot = { reselects.tryEmit(it) },
                bottomBarModifier =
                    Modifier
                        .onSizeChanged { bottomBarHeight = with(density) { it.height.toDp() } }
                        .graphicsLayer { translationY = sheet.progress * size.height },
            )
            MusicSnackbarHost(
                hostState = snackbarHostState,
                modifier =
                    Modifier
                        .align(Alignment.BottomCenter)
                        .padding(
                            bottom = bottomBarHeight + if (player.current != null) MiniPlayerSpace else 0.dp,
                        ),
            )
            PlayerSheet(
                player = player,
                sheet = sheet,
                bottomBarHeight = bottomBarHeight,
                onOpenAlbum = { albumId ->
                    if (backStack.lastOrNull() != AlbumRoute(albumId)) {
                        backStack.add(
                            AlbumRoute(
                                albumId,
                            ),
                        )
                    }
                },
            )
        }
    }
}

@Composable
private fun MainScaffold(
    tab: MainTab,
    backStack: NavBackStack<NavKey>,
    entries: List<NavEntry<NavKey>>,
    reserveMiniPlayer: Boolean,
    onSelectTab: (MainTab) -> Unit,
    onReselectRoot: (MainTab) -> Unit,
    bottomBarModifier: Modifier,
) {
    Scaffold(
        containerColor = MusicTheme.colors.background,
        bottomBar = {
            MusicBottomNav(
                modifier = bottomBarModifier,
                selected = tab,
                onSelect = {
                    if (it == tab) {
                        if (backStack.size == 1) onReselectRoot(it)
                        while (backStack.size > 1) backStack.removeLastOrNull()
                    } else {
                        onSelectTab(it)
                    }
                },
            )
        },
    ) { padding ->
        val contentPadding =
            if (reserveMiniPlayer) {
                PaddingValues(
                    top = padding.calculateTopPadding(),
                    bottom = padding.calculateBottomPadding() + MiniPlayerSpace,
                )
            } else {
                padding
            }
        CompositionLocalProvider(LocalContentPadding provides contentPadding) {
            NavDisplay(
                entries = entries,
                transitionSpec = { pageTransition() },
                popTransitionSpec = { pageTransition() },
                predictivePopTransitionSpec = { pageTransition() },
                onBack = { backStack.removeLastOrNull() },
            )
        }
    }
}

private fun mainEntries(
    backStack: NavBackStack<NavKey>,
    reselects: Flow<MainTab>,
    onOpenTab: (MainTab) -> Unit,
) = entryProvider {
    val openAlbum: (Long) -> Unit = { backStack.add(AlbumRoute(it)) }
    val openParty: (Long) -> Unit = { backStack.add(PartyRoute(it)) }
    val openPlaylist: (Long) -> Unit = { backStack.add(PlaylistRoute(it)) }
    val openDownloads: () -> Unit = { backStack.add(DownloadsRoute) }
    val back: () -> Unit = { backStack.removeLastOrNull() }

    entry<TabRoute> { route ->
        val padding = LocalContentPadding.current
        when (route.tab) {
            MainTab.Home ->
                HomeScreen(
                    contentPadding = padding,
                    onOpenTab = onOpenTab,
                    onOpenAlbum = openAlbum,
                    onOpenParty = openParty,
                    onOpenSettings = { backStack.add(SettingsRoute) },
                )

            MainTab.Albums -> AlbumsScreen(contentPadding = padding, onOpenAlbum = openAlbum)
            MainTab.Parties -> PartiesScreen(contentPadding = padding, onOpenParty = openParty)
            MainTab.Search ->
                SearchScreen(
                    contentPadding = padding,
                    onOpenAlbum = openAlbum,
                    onOpenParty = openParty,
                    reselects = reselects,
                )

            MainTab.Playlists -> PlaylistsScreen(contentPadding = padding, onOpenPlaylist = openPlaylist)
        }
    }
    entry<AlbumRoute> { route ->
        AlbumDetailScreen(
            albumId = route.albumId,
            contentPadding = LocalContentPadding.current,
            onBack = back,
            onOpenParty = openParty,
        )
    }
    entry<PartyRoute> { route ->
        PartyDetailScreen(
            partyId = route.partyId,
            contentPadding = LocalContentPadding.current,
            onBack = back,
            onOpenAlbum = openAlbum,
            onOpenParty = openParty,
        )
    }
    entry<PlaylistRoute> { route ->
        PlaylistDetailScreen(
            playlistId = route.playlistId,
            contentPadding = LocalContentPadding.current,
            onBack = back,
            onDeleted = { if (backStack.lastOrNull() == route) backStack.removeLastOrNull() },
            onOpenAlbum = openAlbum,
            onOpenParty = openParty,
        )
    }
    entry<SettingsRoute> {
        SettingsScreen(
            contentPadding = LocalContentPadding.current,
            onBack = back,
            onOpenDownloads = openDownloads,
        )
    }
    entry<DownloadsRoute> {
        DownloadsScreen(
            contentPadding = LocalContentPadding.current,
            onBack = back,
            onOpenAlbum = openAlbum,
            onOpenPlaylist = openPlaylist,
        )
    }
}
