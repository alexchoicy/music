package com.alexchoicy.music

import android.app.Application
import androidx.room3.Room
import com.alexchoicy.music.api.AuthApi
import com.alexchoicy.music.api.HomeApi
import com.alexchoicy.music.api.createHttpClient
import com.alexchoicy.music.data.MusicDatabase
import com.alexchoicy.music.data.home.HomeRepository
import com.alexchoicy.music.session.SessionStore

class MusicApplication : Application() {
    private val httpClient by lazy { createHttpClient() }
    val database by lazy {
        Room.databaseBuilder(this, MusicDatabase::class.java, "music.db").build()
    }

    val session by lazy { SessionStore(this) }
    val authApi by lazy { AuthApi(httpClient) }
    val homeRepository by lazy { HomeRepository(session, HomeApi(httpClient), database.homeDao()) }
}
