package com.alexchoicy.music.playback

import android.app.PendingIntent
import android.content.Intent
import androidx.compose.runtime.snapshotFlow
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.alexchoicy.music.MainActivity
import com.alexchoicy.music.MusicApplication
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.launch

// Hosts the media session for the notification, lock screen, and headset controls.
// The app's MusicPlayer owns playback and outlives this service.
@androidx.annotation.OptIn(UnstableApi::class)
class PlaybackService : MediaSessionService() {
    private val scope = MainScope()
    private var session: MediaSession? = null

    override fun onCreate() {
        super.onCreate()
        val player = (application as MusicApplication).player
        val artwork = ArtworkBitmapLoader(this)
        val sessionPlayer = SessionPlayer(player, artwork)
        session =
            MediaSession
                .Builder(this, sessionPlayer)
                .setCallback(
                    object : MediaSession.Callback {
                        override fun onConnectAsync(
                            session: MediaSession,
                            controller: MediaSession.ControllerInfo,
                        ): ListenableFuture<MediaSession.ConnectionResult> {
                            val result = MediaSession.ConnectionResult.AcceptedResultBuilder(session, controller)
                            if (!controller.isTrusted) {
                                result.setAvailablePlayerCommands(
                                    MediaSession.ConnectionResult.DEFAULT_UNTRUSTED_PLAYER_COMMANDS
                                        .buildUpon()
                                        .addAll(
                                            Player.COMMAND_PLAY_PAUSE,
                                            Player.COMMAND_PREPARE,
                                            Player.COMMAND_STOP,
                                            Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM,
                                            Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM,
                                            Player.COMMAND_SEEK_TO_PREVIOUS,
                                            Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM,
                                            Player.COMMAND_SEEK_TO_NEXT,
                                            Player.COMMAND_SEEK_TO_MEDIA_ITEM,
                                            Player.COMMAND_SEEK_TO_DEFAULT_POSITION,
                                            Player.COMMAND_SEEK_BACK,
                                            Player.COMMAND_SEEK_FORWARD,
                                            Player.COMMAND_SET_REPEAT_MODE,
                                            Player.COMMAND_SET_SHUFFLE_MODE,
                                            Player.COMMAND_SET_SPEED_AND_PITCH,
                                        ).build(),
                                )
                            }
                            return Futures.immediateFuture(result.build())
                        }
                    },
                ).setBitmapLoader(artwork)
                .setSessionActivity(
                    PendingIntent.getActivity(
                        this,
                        0,
                        Intent(this, MainActivity::class.java),
                        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
                    ),
                ).build()
        scope.launch {
            snapshotFlow { player.hasNext }.drop(1).collect { sessionPlayer.commandsChanged() }
        }
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo) = session

    override fun onDestroy() {
        scope.cancel()
        (application as MusicApplication).player.run {
            savePosition()
            pause()
        }
        session?.release()
        session = null
        super.onDestroy()
    }
}
