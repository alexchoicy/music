package com.alexchoicy.music.ui.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.alexchoicy.music.api.AuthApi
import com.alexchoicy.music.api.LoginOutcome
import com.alexchoicy.music.data.MusicDatabase
import com.alexchoicy.music.session.SessionStore
import kotlinx.coroutines.launch

class LoginViewModel(
    private val session: SessionStore,
    private val api: AuthApi,
    private val database: MusicDatabase,
    private val deviceName: String?,
) : ViewModel() {
    var signingIn by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    fun signIn(
        username: String,
        password: String,
    ) {
        val serverUrl = session.serverUrl
        if (signingIn || serverUrl == null) return
        signingIn = true
        viewModelScope.launch {
            when (val outcome = api.login(serverUrl, username, password, deviceName)) {
                is LoginOutcome.SignedIn -> session.updateToken(outcome.token)
                LoginOutcome.InvalidCredentials -> error = "Wrong username or password"
                LoginOutcome.ServerError -> error = "The server couldn't sign you in. Try again."
                LoginOutcome.Unreachable -> error = "Couldn't reach the server"
            }
            signingIn = false
        }
    }

    fun changeServer() {
        error = null
        viewModelScope.launch {
            database.clearAllTables()
            session.updateServerUrl(null)
        }
    }

    fun clearError() {
        error = null
    }
}
