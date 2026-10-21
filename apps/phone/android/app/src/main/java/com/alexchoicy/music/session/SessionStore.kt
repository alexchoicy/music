package com.alexchoicy.music.session

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.edit

class SessionStore(context: Context) {
    private val preferences = context.getSharedPreferences("session", Context.MODE_PRIVATE)

    var serverUrl by mutableStateOf(preferences.getString(SERVER_URL_KEY, null))
        private set
    var token by mutableStateOf(preferences.getString(TOKEN_KEY, null))
        private set

    fun updateServerUrl(serverUrl: String?) {
        preferences.edit {
            putString(SERVER_URL_KEY, serverUrl)
            remove(TOKEN_KEY)
        }
        this.serverUrl = serverUrl
        token = null
    }

    fun updateToken(token: String?) {
        preferences.edit { putString(TOKEN_KEY, token) }
        this.token = token
    }

    private companion object {
        const val SERVER_URL_KEY = "serverUrl"
        const val TOKEN_KEY = "authToken"
    }
}
