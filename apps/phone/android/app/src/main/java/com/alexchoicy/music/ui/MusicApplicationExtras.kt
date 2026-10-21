package com.alexchoicy.music.ui

import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewmodel.CreationExtras
import com.alexchoicy.music.MusicApplication

internal fun CreationExtras.musicApplication() = this[APPLICATION_KEY] as MusicApplication
