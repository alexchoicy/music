package com.alexchoicy.music.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewmodel.CreationExtras
import com.alexchoicy.music.MusicApplication

internal fun CreationExtras.musicApplication() = this[APPLICATION_KEY] as MusicApplication

@Composable
@ReadOnlyComposable
internal fun currentMusicApplication() = LocalContext.current.applicationContext as MusicApplication
