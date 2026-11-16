package com.alexchoicy.music.playback

import android.content.Context
import android.net.Uri
import androidx.core.net.toUri
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.ResolvingDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import com.alexchoicy.music.api.PlaybackApi
import kotlinx.coroutines.runBlocking
import java.io.File
import java.io.IOException

private const val FILE_SCHEME = "musicfile"
private const val MAX_BYTES = 1024L * 1024 * 1024

@androidx.annotation.OptIn(UnstableApi::class)
class StreamCache(
    context: Context,
    private val api: PlaybackApi,
    private val network: NetworkMonitor,
) {
    private val cache =
        SimpleCache(
            File(context.cacheDir, "streams"),
            LeastRecentlyUsedCacheEvictor(MAX_BYTES),
            StandaloneDatabaseProvider(context),
        )
    private val direct = DefaultDataSource.Factory(context)
    private val links =
        DataSource.Factory {
            var requested: Uri? = null
            ResolvingDataSource(
                direct.createDataSource(),
                object : ResolvingDataSource.Resolver {
                    override fun resolveDataSpec(dataSpec: DataSpec): DataSpec {
                        requested = dataSpec.uri
                        return dataSpec.withUri(resolve(dataSpec.uri))
                    }

                    override fun resolveReportedUri(uri: Uri) = requested ?: uri
                },
            )
        }
    private val reading = cached().setCacheWriteDataSinkFactory(null)

    val playback: DataSource.Factory = DefaultDataSource.Factory(context, cached())

    private fun cached() = CacheDataSource.Factory().setCache(cache).setUpstreamDataSourceFactory(links)

    fun reader(): DataSource = reading.createDataSource()

    fun uri(fileId: String): Uri =
        Uri
            .Builder()
            .scheme(FILE_SCHEME)
            .authority("audio")
            .appendPath(fileId)
            .build()

    private fun resolve(uri: Uri): Uri {
        val fileId = uri.lastPathSegment ?: throw IOException("Couldn't resolve $uri")
        if (!network.online) throw IOException("Couldn't reach the server for $uri")
        return try {
            runBlocking { api.fileUrl(fileId) }.toUri()
        } catch (e: Exception) {
            throw IOException("Couldn't resolve $uri", e)
        }
    }
}
