package com.alexchoicy.music.ui.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.alexchoicy.music.api.AuthApi
import com.alexchoicy.music.session.SessionStore
import kotlinx.coroutines.launch

class SetupViewModel(private val session: SessionStore, private val api: AuthApi) : ViewModel() {
    var checking by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    fun connect(serverUrl: String) {
        if (checking) return
        val address = serverUrl.trim().trimEnd('/')
        checking = true
        viewModelScope.launch {
            if (api.checkServer(address)) {
                session.updateServerUrl(address)
            } else {
                error = "Couldn't reach a Music server there"
            }
            checking = false
        }
    }

    fun clearError() {
        error = null
    }
}
