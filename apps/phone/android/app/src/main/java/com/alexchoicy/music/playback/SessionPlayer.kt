package com.alexchoicy.music.playback

import android.graphics.Bitmap
import android.net.Uri
import androidx.media3.common.ForwardingSimpleBasePlayer
import androidx.media3.common.MediaMetadata
import androidx.media3.common.util.UnstableApi
import com.google.common.util.concurrent.FutureCallback
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import java.io.ByteArrayOutputStream

private const val ARTWORK_SIZE_PX = 480
private const val ARTWORK_QUALITY = 85

@androidx.annotation.OptIn(UnstableApi::class)
class SessionPlayer(
    private val player: MusicPlayer,
    private val artwork: ArtworkBitmapLoader,
) : ForwardingSimpleBasePlayer(player.exo) {
    private var artworkUri: Uri? = null
    private var artworkData: ByteArray? = null

    override fun getState(): State {
        val state = super.getState()
        val metadata = state.currentMetadata
        loadArtwork(metadata.artworkUri)
        val data = artworkData
        val builder = state.buildUpon()
        // Watch bridges show only artwork data, not the artwork URI.
        if (data != null && metadata.artworkData == null) {
            builder.setPlaylist(
                state.timeline,
                state.currentTracks,
                metadata.buildUpon().setArtworkData(data, MediaMetadata.PICTURE_TYPE_FRONT_COVER).build(),
            )
        }
        if (player.hasNext) {
            builder.setAvailableCommands(
                state.availableCommands
                    .buildUpon()
                    .addAll(COMMAND_SEEK_TO_NEXT, COMMAND_SEEK_TO_NEXT_MEDIA_ITEM)
                    .build(),
            )
        }
        return builder.build()
    }

    private fun loadArtwork(uri: Uri?) {
        if (uri == artworkUri) return
        artworkUri = uri
        artworkData = null
        if (uri == null) return
        Futures.addCallback(
            artwork.loadBitmap(uri, ARTWORK_SIZE_PX),
            object : FutureCallback<Bitmap> {
                override fun onSuccess(bitmap: Bitmap) {
                    if (uri != artworkUri) return
                    artworkData =
                        ByteArrayOutputStream()
                            .also { bitmap.compress(Bitmap.CompressFormat.JPEG, ARTWORK_QUALITY, it) }
                            .toByteArray()
                    invalidateState()
                }

                override fun onFailure(t: Throwable) {}
            },
            MoreExecutors.directExecutor(),
        )
    }

    override fun handleSetPlayWhenReady(playWhenReady: Boolean): ListenableFuture<*> {
        if (!playWhenReady) return super.handleSetPlayWhenReady(false)
        player.play()
        return Futures.immediateVoidFuture()
    }

    override fun handleSeek(
        mediaItemIndex: Int,
        positionMs: Long,
        seekCommand: Int,
    ): ListenableFuture<*> {
        when (seekCommand) {
            COMMAND_SEEK_TO_NEXT, COMMAND_SEEK_TO_NEXT_MEDIA_ITEM -> player.skipNext()
            COMMAND_SEEK_TO_PREVIOUS, COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM -> player.skipPrevious()
            COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM -> player.seekTo(positionMs)
            COMMAND_SEEK_TO_MEDIA_ITEM ->
                if (mediaItemIndex == player.exo.currentMediaItemIndex) {
                    return super.handleSeek(mediaItemIndex, positionMs, seekCommand)
                } else {
                    player.playEntry(player.exo.getMediaItemAt(mediaItemIndex).mediaId)
                }
            else -> return super.handleSeek(mediaItemIndex, positionMs, seekCommand)
        }
        return Futures.immediateVoidFuture()
    }

    override fun handleSetShuffleModeEnabled(shuffleModeEnabled: Boolean): ListenableFuture<*> {
        if (shuffleModeEnabled != player.shuffle) player.toggleShuffle()
        return Futures.immediateVoidFuture()
    }

    // Radio availability changes without ExoPlayer's state changing.
    fun commandsChanged() = invalidateState()
}
