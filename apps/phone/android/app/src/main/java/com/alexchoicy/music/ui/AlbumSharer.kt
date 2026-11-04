package com.alexchoicy.music.ui

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.core.net.toUri
import com.alexchoicy.music.MusicApplication
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class AlbumSharer(
    private val context: Context,
    private val scope: CoroutineScope,
) {
    fun share(
        albumId: Long,
        title: String,
        trackId: Long? = null,
    ) {
        scope.launch {
            val app = context.applicationContext as MusicApplication
            val shareUrl = app.detailRepository.albumShareUrl(albumId)
            if (shareUrl == null) {
                app.notices.show(if (trackId == null) "Couldn't share this album" else "Couldn't share this track")
                return@launch
            }
            val url =
                if (trackId == null) {
                    shareUrl
                } else {
                    shareUrl
                        .toUri()
                        .buildUpon()
                        .appendQueryParameter("track", trackId.toString())
                        .build()
                        .toString()
                }
            val intent =
                Intent(Intent.ACTION_SEND)
                    .setType("text/plain")
                    .putExtra(Intent.EXTRA_TEXT, url)
                    .putExtra(Intent.EXTRA_TITLE, title)
            context.startActivity(Intent.createChooser(intent, null))
        }
    }
}

@Composable
fun rememberAlbumSharer(): AlbumSharer {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    return remember(context, scope) { AlbumSharer(context, scope) }
}
