package com.alexchoicy.music.playback

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.edit

enum class AudioQuality(
    val label: String,
) {
    Original("Original"),
    Efficient("Efficient"),
}

enum class StreamQuality(
    val label: String,
) {
    Auto("Auto"),
    Original("Original"),
    Efficient("Efficient"),
}

class PlaybackSettings(
    context: Context,
    private val network: NetworkMonitor,
) {
    private val preferences = context.getSharedPreferences("playback", Context.MODE_PRIVATE)

    var streamQuality by mutableStateOf(
        enumPreference(STREAM_QUALITY_KEY, StreamQuality.entries) ?: StreamQuality.Auto,
    )
        private set
    var downloadQuality by mutableStateOf(
        enumPreference(DOWNLOAD_QUALITY_KEY, AudioQuality.entries) ?: AudioQuality.Original,
    )
        private set
    var savePlayedTracks by mutableStateOf(preferences.getBoolean(SAVE_PLAYED_KEY, false))
        private set
    var upgradeOnWifi by mutableStateOf(preferences.getBoolean(UPGRADE_ON_WIFI_KEY, false))
        private set
    var downloadOnMobileData by mutableStateOf(preferences.getBoolean(MOBILE_DATA_KEY, false))
        private set
    var radio by mutableStateOf(preferences.getBoolean(RADIO_KEY, false))
        private set
    var playTalkTracks by mutableStateOf(preferences.getBoolean(PLAY_TALK_KEY, false))
        private set
    var playInstrumentals by mutableStateOf(preferences.getBoolean(PLAY_INSTRUMENTAL_KEY, false))
        private set

    // Auto streams originals on Wi-Fi and Efficient on mobile data.
    val resolvedStreamQuality: AudioQuality
        get() =
            when (streamQuality) {
                StreamQuality.Auto -> if (network.unmetered) AudioQuality.Original else AudioQuality.Efficient
                StreamQuality.Original -> AudioQuality.Original
                StreamQuality.Efficient -> AudioQuality.Efficient
            }

    fun updateStreamQuality(value: StreamQuality) {
        preferences.edit { putString(STREAM_QUALITY_KEY, value.name) }
        streamQuality = value
    }

    fun updateDownloadQuality(value: AudioQuality) {
        preferences.edit { putString(DOWNLOAD_QUALITY_KEY, value.name) }
        downloadQuality = value
    }

    fun updateSavePlayedTracks(value: Boolean) {
        preferences.edit { putBoolean(SAVE_PLAYED_KEY, value) }
        savePlayedTracks = value
    }

    fun updateUpgradeOnWifi(value: Boolean) {
        preferences.edit { putBoolean(UPGRADE_ON_WIFI_KEY, value) }
        upgradeOnWifi = value
    }

    fun updateDownloadOnMobileData(value: Boolean) {
        preferences.edit { putBoolean(MOBILE_DATA_KEY, value) }
        downloadOnMobileData = value
    }

    fun updateRadio(value: Boolean) {
        preferences.edit { putBoolean(RADIO_KEY, value) }
        radio = value
    }

    fun updatePlayTalkTracks(value: Boolean) {
        preferences.edit { putBoolean(PLAY_TALK_KEY, value) }
        playTalkTracks = value
    }

    fun updatePlayInstrumentals(value: Boolean) {
        preferences.edit { putBoolean(PLAY_INSTRUMENTAL_KEY, value) }
        playInstrumentals = value
    }

    private fun <T : Enum<T>> enumPreference(
        key: String,
        entries: List<T>,
    ): T? = preferences.getString(key, null)?.let { name -> entries.firstOrNull { it.name == name } }

    private companion object {
        const val STREAM_QUALITY_KEY = "streamQuality"
        const val DOWNLOAD_QUALITY_KEY = "downloadQuality"
        const val SAVE_PLAYED_KEY = "savePlayedTracks"
        const val UPGRADE_ON_WIFI_KEY = "upgradeOnWifi"
        const val MOBILE_DATA_KEY = "downloadOnMobileData"
        const val RADIO_KEY = "radio"
        const val PLAY_TALK_KEY = "playTalkTracks"
        const val PLAY_INSTRUMENTAL_KEY = "playInstrumentals"
    }
}
