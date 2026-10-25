package com.alexchoicy.music.playback

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Handler
import android.os.Looper
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

class NetworkMonitor(
    context: Context,
) {
    private val connectivity = context.getSystemService(ConnectivityManager::class.java)

    var online by mutableStateOf(false)
        private set

    var unmetered by mutableStateOf(false)
        private set

    init {
        update(connectivity.getNetworkCapabilities(connectivity.activeNetwork))
        connectivity.registerDefaultNetworkCallback(
            object : ConnectivityManager.NetworkCallback() {
                override fun onCapabilitiesChanged(
                    network: Network,
                    capabilities: NetworkCapabilities,
                ) = update(capabilities)

                override fun onLost(network: Network) = update(null)
            },
            Handler(Looper.getMainLooper()),
        )
    }

    private fun update(capabilities: NetworkCapabilities?) {
        online = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        unmetered = online &&
            capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED) == true
    }
}
