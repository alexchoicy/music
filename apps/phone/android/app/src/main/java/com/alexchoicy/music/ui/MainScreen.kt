package com.alexchoicy.music.ui

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.EnterExitState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDp
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.navigation3.rememberViewModelStoreNavEntryDecorator
import androidx.navigation3.runtime.NavBackStack
import androidx.navigation3.runtime.NavEntryDecorator
import androidx.navigation3.runtime.NavKey
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberDecoratedNavEntries
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.runtime.rememberSaveableStateHolderNavEntryDecorator
import androidx.navigation3.scene.Scene
import androidx.navigation3.ui.LocalNavAnimatedContentScope
import androidx.navigation3.ui.NavDisplay
import com.alexchoicy.music.ui.albums.AlbumDetailScreen
import com.alexchoicy.music.ui.albums.AlbumsScreen
import com.alexchoicy.music.ui.components.MainTab
import com.alexchoicy.music.ui.components.MusicBottomNav
import com.alexchoicy.music.ui.home.HomeScreen
import com.alexchoicy.music.ui.parties.PartiesScreen
import com.alexchoicy.music.ui.parties.PartyDetailScreen
import com.alexchoicy.music.ui.theme.MusicTheme
import kotlinx.serialization.Serializable

@Serializable
private data class TabRoute(val tab: MainTab) : NavKey

@Serializable
private data class AlbumRoute(val albumId: Long) : NavKey

@Serializable
private data class PartyRoute(val partyId: Long) : NavKey

private val LocalContentPadding = compositionLocalOf { PaddingValues() }

private const val PAGE_TRANSITION_MS = 300
private const val TAB_TRANSITION_MS = 150
private const val PAGE_FADE_MS = 100
private const val PAGE_SCALE = 0.7f
private val MovingPageCorner = 16.dp

private fun <T> pageTween() = tween<T>(PAGE_TRANSITION_MS, easing = FastOutSlowInEasing)

private fun Scene<*>.rootKey() = (previousEntries.firstOrNull() ?: entries.first()).contentKey

private fun AnimatedContentTransitionScope<Scene<NavKey>>.tabSwitch(): ContentTransform? =
    if (initialState.rootKey() != targetState.rootKey()) {
        fadeIn(tween(TAB_TRANSITION_MS)) togetherWith fadeOut(tween(TAB_TRANSITION_MS))
    } else {
        null
    }

private fun AnimatedContentTransitionScope<Scene<NavKey>>.pushTransition() = tabSwitch()
    ?: (
        scaleIn(pageTween(), initialScale = PAGE_SCALE) + fadeIn(tween(PAGE_FADE_MS)) togetherWith
            fadeOut(pageTween())
        )

private fun AnimatedContentTransitionScope<Scene<NavKey>>.popTransition() = tabSwitch()
    ?: (
        fadeIn(pageTween()) togetherWith
            scaleOut(pageTween(), targetScale = PAGE_SCALE) +
            fadeOut(tween(PAGE_FADE_MS, delayMillis = PAGE_TRANSITION_MS - PAGE_FADE_MS))
        )

@Composable
fun MainScreen() {
    var tab by rememberSaveable { mutableStateOf(MainTab.Home) }
    val background = MusicTheme.colors.background
    val opaquePage = remember(background) {
        NavEntryDecorator<NavKey> { entry ->
            val transition = LocalNavAnimatedContentScope.current.transition
            val corner by transition.animateDp(label = "pageCorner") {
                if (it == EnterExitState.Visible) 0.dp else MovingPageCorner
            }
            Box(
                Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(corner))
                    .background(background),
            ) { entry.Content() }
        }
    }
    val stacks = MainTab.entries.associateWith { rememberNavBackStack(TabRoute(it)) }
    val entries = MainTab.entries.associateWith { root ->
        val backStack = stacks.getValue(root)
        rememberDecoratedNavEntries(
            backStack = backStack,
            entryDecorators = listOf(
                rememberSaveableStateHolderNavEntryDecorator(),
                rememberViewModelStoreNavEntryDecorator(),
                opaquePage,
            ),
            entryProvider = mainEntries(backStack) { tab = it },
        )
    }
    val backStack = stacks.getValue(tab)

    Scaffold(
        containerColor = MusicTheme.colors.background,
        bottomBar = {
            MusicBottomNav(
                selected = tab,
                onSelect = {
                    if (it == tab) {
                        while (backStack.size > 1) backStack.removeLastOrNull()
                    } else {
                        tab = it
                    }
                },
            )
        },
    ) { padding ->
        CompositionLocalProvider(LocalContentPadding provides padding) {
            NavDisplay(
                entries = entries.getValue(tab),
                transitionSpec = { pushTransition() },
                popTransitionSpec = { popTransition() },
                predictivePopTransitionSpec = { popTransition() },
                onBack = { backStack.removeLastOrNull() },
            )
        }
    }
}

private fun mainEntries(
    backStack: NavBackStack<NavKey>,
    onOpenTab: (MainTab) -> Unit,
) = entryProvider<NavKey> {
    val openAlbum: (Long) -> Unit = { backStack.add(AlbumRoute(it)) }
    val openParty: (Long) -> Unit = { backStack.add(PartyRoute(it)) }
    val back: () -> Unit = { backStack.removeLastOrNull() }

    entry<TabRoute> { route ->
        val padding = LocalContentPadding.current
        when (route.tab) {
            MainTab.Home -> HomeScreen(
                contentPadding = padding,
                onOpenTab = onOpenTab,
                onOpenAlbum = openAlbum,
                onOpenParty = openParty,
            )
            MainTab.Albums -> AlbumsScreen(contentPadding = padding, onOpenAlbum = openAlbum)
            MainTab.Parties -> PartiesScreen(contentPadding = padding, onOpenParty = openParty)
            else -> Text(
                text = route.tab.label,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(24.dp),
                style = MaterialTheme.typography.headlineLarge,
                color = MusicTheme.colors.foreground,
            )
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
}
