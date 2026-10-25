package com.alexchoicy.music.offline

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.ServiceInfo
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import com.alexchoicy.music.MusicApplication
import com.alexchoicy.music.R
import kotlinx.coroutines.CancellationException

class DownloadWorker(
    context: Context,
    parameters: WorkerParameters,
) : CoroutineWorker(context, parameters) {
    private val downloads get() = (applicationContext as MusicApplication).downloads

    override suspend fun doWork(): Result {
        if (inputData.getBoolean(UPGRADE_KEY, false)) {
            downloads.runUpgrades()
        } else {
            downloads.runPending { track, remaining ->
                // Keeps long downloads running; the system may refuse while the app is in the background.
                try {
                    setForeground(foregroundInfo(track.title, remaining))
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                }
            }
        }
        return Result.success()
    }

    private fun foregroundInfo(
        title: String,
        remaining: Int,
    ): ForegroundInfo {
        val manager = applicationContext.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "Downloads", NotificationManager.IMPORTANCE_LOW),
        )
        val notification =
            NotificationCompat
                .Builder(applicationContext, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_download)
                .setContentTitle(if (remaining > 1) "Downloading $remaining tracks" else "Downloading")
                .setContentText(title)
                .setProgress(0, 0, true)
                .setOngoing(true)
                .setSilent(true)
                .build()
        return ForegroundInfo(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    }

    companion object {
        const val UPGRADE_KEY = "upgrade"
        private const val CHANNEL_ID = "downloads"
        private const val NOTIFICATION_ID = 2
    }
}
