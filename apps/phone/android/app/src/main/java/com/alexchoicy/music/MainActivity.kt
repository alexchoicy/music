package com.alexchoicy.music

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.Modifier
import com.alexchoicy.music.ui.MainScreen
import com.alexchoicy.music.ui.auth.LoginScreen
import com.alexchoicy.music.ui.auth.SetupScreen
import com.alexchoicy.music.ui.theme.MusicTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val darkTheme = isSystemInDarkTheme()
            SideEffect {
                val barStyle =
                    SystemBarStyle.auto(
                        android.graphics.Color.TRANSPARENT,
                        android.graphics.Color.TRANSPARENT,
                    ) { darkTheme }
                enableEdgeToEdge(statusBarStyle = barStyle, navigationBarStyle = barStyle)
            }
            MusicTheme(darkTheme = darkTheme) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MusicTheme.colors.background,
                ) {
                    val session = (application as MusicApplication).session
                    val serverUrl = session.serverUrl
                    when {
                        serverUrl == null -> SetupScreen()
                        session.token == null -> LoginScreen(serverUrl = serverUrl)
                        else -> MainScreen()
                    }
                }
            }
        }
    }
}
