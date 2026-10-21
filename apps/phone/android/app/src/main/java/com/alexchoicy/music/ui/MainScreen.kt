package com.alexchoicy.music.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.ui.components.MainTab
import com.alexchoicy.music.ui.components.MusicBottomNav
import com.alexchoicy.music.ui.home.HomeScreen
import com.alexchoicy.music.ui.theme.MusicTheme

@Composable
fun MainScreen() {
    var tab by rememberSaveable { mutableStateOf(MainTab.Home) }

    Scaffold(
        containerColor = MusicTheme.colors.background,
        bottomBar = { MusicBottomNav(selected = tab, onSelect = { tab = it }) },
    ) { padding ->
        when (tab) {
            MainTab.Home -> HomeScreen(contentPadding = padding, onOpenTab = { tab = it })
            else -> Text(
                text = tab.label,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(24.dp),
                style = MaterialTheme.typography.headlineLarge,
                color = MusicTheme.colors.foreground,
            )
        }
    }
}
