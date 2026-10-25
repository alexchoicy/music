package com.alexchoicy.music.playback

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import androidx.media3.common.MediaMetadata
import androidx.media3.common.util.BitmapLoader
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSourceBitmapLoader
import coil3.SingletonImageLoader
import coil3.request.ImageRequest
import coil3.request.allowHardware
import coil3.request.target
import coil3.toBitmap
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.SettableFuture
import java.io.IOException

// Loads covers through the app's image loader, so they are cached and downloaded copies are used.
@androidx.annotation.OptIn(UnstableApi::class)
class ArtworkBitmapLoader(
    private val context: Context,
    private val delegate: BitmapLoader = DataSourceBitmapLoader.Builder(context).build(),
) : BitmapLoader by delegate {
    override fun loadBitmap(uri: Uri): ListenableFuture<Bitmap> = loadBitmap(uri, null)

    fun loadBitmap(
        uri: Uri,
        sizePx: Int?,
    ): ListenableFuture<Bitmap> {
        val future = SettableFuture.create<Bitmap>()
        val request =
            ImageRequest
                .Builder(context)
                .data(uri.toString())
                .allowHardware(false)
                .apply { if (sizePx != null) size(sizePx) }
                .target(
                    onError = { future.setException(IOException("Couldn't load $uri")) },
                    onSuccess = { future.set(it.toBitmap()) },
                ).build()
        SingletonImageLoader.get(context).enqueue(request)
        return future
    }

    // The artwork data is a small copy for watches, so the notification loads the full cover.
    override fun loadBitmapFromMetadata(metadata: MediaMetadata): ListenableFuture<Bitmap>? =
        metadata.artworkUri?.let(::loadBitmap) ?: super.loadBitmapFromMetadata(metadata)
}
