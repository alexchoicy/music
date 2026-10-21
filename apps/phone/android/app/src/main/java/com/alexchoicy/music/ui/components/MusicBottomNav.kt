package com.alexchoicy.music.ui.components

import androidx.annotation.DrawableRes
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import com.alexchoicy.music.R
import com.alexchoicy.music.ui.theme.MusicTheme

enum class MainTab(val label: String, @param:DrawableRes val icon: Int) {
    Home("Home", R.drawable.ic_home),
    Albums("Albums", R.drawable.ic_albums),
    Parties("Parties", R.drawable.ic_parties),
    Search("Search", R.drawable.ic_search),
    Playlists("Playlists", R.drawable.ic_playlists),
}

@Composable
fun MusicBottomNav(selected: MainTab, onSelect: (MainTab) -> Unit, modifier: Modifier = Modifier) {
    val colors = MusicTheme.colors
    NavigationBar(
        modifier = modifier,
        containerColor = colors.sidebar,
        contentColor = colors.sidebarForeground,
    ) {
        MainTab.entries.forEach { tab ->
            NavigationBarItem(
                selected = tab == selected,
                onClick = { onSelect(tab) },
                icon = { Icon(painterResource(tab.icon), contentDescription = null) },
                label = { Text(tab.label, style = MaterialTheme.typography.labelSmall) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = colors.primary,
                    selectedTextColor = colors.foreground,
                    indicatorColor = colors.sidebarAccent,
                    unselectedIconColor = colors.sidebarForeground,
                    unselectedTextColor = colors.sidebarForeground,
                ),
            )
        }
    }
}
