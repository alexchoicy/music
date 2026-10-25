package com.alexchoicy.music

import android.app.Application
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.room3.Room
import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.map.Mapper
import com.alexchoicy.music.api.ApiClient
import com.alexchoicy.music.api.AuthApi
import com.alexchoicy.music.api.DetailApi
import com.alexchoicy.music.api.HomeApi
import com.alexchoicy.music.api.LibraryApi
import com.alexchoicy.music.api.PlaybackApi
import com.alexchoicy.music.api.SearchApi
import com.alexchoicy.music.api.createHttpClient
import com.alexchoicy.music.data.MusicDatabase
import com.alexchoicy.music.data.detail.DetailRepository
import com.alexchoicy.music.data.home.HomeRepository
import com.alexchoicy.music.data.library.LibraryRepository
import com.alexchoicy.music.data.search.SearchRepository
import com.alexchoicy.music.devices.PlaybackDevices
import com.alexchoicy.music.offline.Downloads
import com.alexchoicy.music.playback.MusicPlayer
import com.alexchoicy.music.playback.NetworkMonitor
import com.alexchoicy.music.playback.PlaybackSettings
import com.alexchoicy.music.session.SessionStore
import kotlinx.coroutines.MainScope
import java.io.File

class MusicApplication :
    Application(),
    SingletonImageLoader.Factory {
    private val scope = MainScope()
    private val httpClient by lazy { createHttpClient() }
    val database by lazy {
        Room.databaseBuilder(this, MusicDatabase::class.java, "music.db").build()
    }

    val session by lazy { SessionStore(this) }
    private val apiClient by lazy { ApiClient(httpClient, session) }
    val authApi by lazy { AuthApi(httpClient) }
    val homeRepository by lazy {
        HomeRepository(session, HomeApi(apiClient), database.homeDao(), devices.deviceId)
    }
    val libraryRepository by lazy {
        LibraryRepository(session, LibraryApi(apiClient), database.libraryDao())
    }
    val searchRepository by lazy { SearchRepository(SearchApi(apiClient), database.libraryDao()) }
    val detailRepository by lazy { DetailRepository(DetailApi(apiClient), database.detailDao()) }
    val notices = Notices()
    val network by lazy { NetworkMonitor(this) }
    private val playbackApi by lazy { PlaybackApi(apiClient) }
    val playbackSettings by lazy { PlaybackSettings(this, network) }
    val downloads by lazy {
        Downloads(
            context = this,
            dao = database.offlineDao(),
            api = playbackApi,
            details = detailRepository,
            settings = playbackSettings,
            http = httpClient,
            scope = scope,
        )
    }
    private val playerLazy =
        lazy {
            MusicPlayer(this, playbackApi, playbackSettings, network, downloads, database.queueDao(), notices, scope)
        }
    val player by playerLazy
    val devices by lazy { PlaybackDevices(this, session, player, network, notices, scope) }

    override fun onCreate() {
        super.onCreate()
        ProcessLifecycleOwner.get().lifecycle.addObserver(
            LifecycleEventObserver { _, event ->
                if (event == Lifecycle.Event.ON_STOP && playerLazy.isInitialized()) player.savePosition()
            },
        )
    }

    override fun newImageLoader(context: PlatformContext): ImageLoader =
        ImageLoader
            .Builder(context)
            .components { add(Mapper<String, File> { url, _ -> downloads.artworkFile(url) }) }
            .build()
}
