package com.alexchoicy.music.offline

import android.content.Context
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.alexchoicy.music.api.AudioFile
import com.alexchoicy.music.api.PlaybackAlbum
import com.alexchoicy.music.api.PlaybackApi
import com.alexchoicy.music.api.PlaybackTrack
import com.alexchoicy.music.api.TrackArtist
import com.alexchoicy.music.api.valueOrNull
import com.alexchoicy.music.data.detail.DetailRepository
import com.alexchoicy.music.data.toPlaybackTrack
import com.alexchoicy.music.data.toStored
import com.alexchoicy.music.playback.AudioQuality
import com.alexchoicy.music.playback.PlaybackSettings
import io.ktor.client.HttpClient
import io.ktor.client.request.prepareGet
import io.ktor.client.statement.bodyAsChannel
import io.ktor.http.isSuccess
import io.ktor.utils.io.readAvailable
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.IOException
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap

data class TrackDownload(
    val trackId: Long,
    val albumId: Long,
    val position: Int,
    val track: PlaybackTrack,
    val fileId: String,
    val file: File,
    val sizeInBytes: Long,
    val status: DownloadStatus,
    val error: String?,
    val played: Boolean,
) {
    val audioFile get() = track.file(fileId)
    val playable get() = status == DownloadStatus.Downloaded && audioFile?.playable != false
}

data class OfflineAlbum(
    val albumId: Long,
    val whole: Boolean,
    val title: String,
    val artists: String?,
    val coverUrl: String?,
    val downloadedAt: Long,
)

data class OfflinePlaylist(
    val playlistId: Long,
    val name: String,
    val coverUrl: String?,
    val downloadedAt: Long,
    val trackIds: List<Long>,
)

data class DownloadStats(
    val total: Int,
    val downloaded: Int,
    val failed: Int,
    val sizeInBytes: Long,
) {
    val active get() = downloaded + failed < total
}

class Downloads(
    context: Context,
    private val dao: OfflineDao,
    private val api: PlaybackApi,
    private val details: DetailRepository,
    private val settings: PlaybackSettings,
    private val http: HttpClient,
    private val scope: CoroutineScope,
) {
    private val workManager = WorkManager.getInstance(context)
    private val audioDirectory = File(context.filesDir, "offline/audio")
    private val artworkDirectory = File(context.filesDir, "offline/artwork")
    private val loaded = CompletableDeferred<Unit>()

    var tracks by mutableStateOf<Map<Long, TrackDownload>>(emptyMap())
        private set
    var albums by mutableStateOf<Map<Long, OfflineAlbum>>(emptyMap())
        private set
    var playlists by mutableStateOf<List<OfflinePlaylist>>(emptyList())
        private set

    val downloadedAlbums by derivedStateOf {
        tracks.values.filter { it.status == DownloadStatus.Downloaded }.mapTo(HashSet()) { it.albumId }
    }

    // From 0 to 1, keyed by track ID; not persisted.
    var progress by mutableStateOf<Map<Long, Float>>(emptyMap())
        private set

    @Volatile
    private var artwork: Map<String, File> = emptyMap()

    // Files being written, which cleanup must leave alone.
    private val activeFiles = ConcurrentHashMap.newKeySet<String>()

    // Track files downloading now, so removing their download stops them. Downloads and
    // upgrades run in separate workers, so there can be more than one.
    private data class ActiveDownload(
        val trackId: Long,
        val fileId: String,
        val job: Job,
    )

    private val activeDownloads = ConcurrentHashMap.newKeySet<ActiveDownload>()

    init {
        scope.launch {
            dao.observeTracks().collect { rows ->
                tracks = rows.map { it.toDownload() }.associateBy { it.trackId }
                loaded.complete(Unit)
            }
        }
        scope.launch {
            dao.observeAlbums().collect { rows ->
                albums =
                    rows.associate {
                        it.albumId to OfflineAlbum(it.albumId, it.whole, it.title, it.artists, it.coverUrl, it.downloadedAt)
                    }
            }
        }
        scope.launch {
            combine(dao.observePlaylists(), dao.observePlaylistTracks()) { rows, tracks ->
                rows to tracks.groupBy { it.playlistId }
            }.collect { (rows, entries) ->
                playlists =
                    rows.map { playlist ->
                        OfflinePlaylist(
                            playlistId = playlist.playlistId,
                            name = playlist.name,
                            coverUrl = playlist.coverUrl,
                            downloadedAt = playlist.downloadedAt,
                            trackIds = entries[playlist.playlistId].orEmpty().map { it.trackId },
                        )
                    }
            }
        }
        scope.launch {
            dao.observeArtwork().collect { rows ->
                artwork = rows.associate { it.url to File(artworkDirectory, it.fileName) }
            }
        }
        scope.launch {
            snapshotFlow { settings.downloadOnMobileData }.drop(1).collect { schedule(replace = true) }
        }
        scope.launch {
            snapshotFlow { settings.upgradeOnWifi }.collect { if (it) scheduleUpgrades() }
        }
        schedule()
    }

    suspend fun awaitLoaded() = loaded.await()

    fun playableFile(trackId: Long): File? = tracks[trackId]?.takeIf { it.playable }?.file

    fun isDownloaded(trackId: Long) = tracks[trackId]?.status == DownloadStatus.Downloaded

    fun artworkFile(url: String): File? = artwork[url]

    fun albumStats(
        albumId: Long,
        include: (TrackDownload) -> Boolean = { true },
    ): DownloadStats = stats(tracks.values.filter { it.albumId == albumId && include(it) })

    fun playlistStats(playlist: OfflinePlaylist): DownloadStats = stats(playlist.trackIds.distinct().mapNotNull { tracks[it] })

    fun totalSize() = tracks.values.filter { it.status == DownloadStatus.Downloaded }.sumOf { it.sizeInBytes }

    // Downloaded tracks of an album, in the album's order when its page is cached.
    suspend fun albumTracks(albumId: Long): List<PlaybackTrack> {
        awaitLoaded()
        val rows = tracks.values.filter { it.albumId == albumId && it.playable }
        val order =
            details
                .album(albumId)
                .first()
                ?.discs
                ?.flatMap { disc -> disc.tracks.map { it.trackId } }
                ?.withIndex()
                ?.associate { (index, trackId) -> trackId to index }
                .orEmpty()
        return rows
            .sortedWith(compareBy({ order[it.trackId] ?: Int.MAX_VALUE }, { it.position }, { it.trackId }))
            .map { it.track }
    }

    // The tracks of a whole-album download, only once every one of them is playable.
    suspend fun completeAlbumTracks(albumId: Long): List<PlaybackTrack>? {
        awaitLoaded()
        if (albums[albumId]?.whole != true) return null
        val rows = tracks.values.filter { it.albumId == albumId }
        if (rows.isEmpty() || !rows.all { it.playable }) return null
        return albumTracks(albumId)
    }

    // Albums whose download was requested and is loading their details.
    var startingAlbums by mutableStateOf<Set<Long>>(emptySet())
        private set

    fun startAlbumDownload(
        albumId: Long,
        onFailed: () -> Unit,
    ) {
        if (albumId in startingAlbums) return
        startingAlbums = startingAlbums + albumId
        scope.launch {
            val started = downloadAlbum(albumId)
            startingAlbums = startingAlbums - albumId
            if (!started) onFailed()
        }
    }

    private suspend fun downloadAlbum(albumId: Long): Boolean {
        val album = api.fetchAlbum(albumId).valueOrNull() ?: return false
        if (album.tracks.isEmpty()) return false
        scope.launch { details.syncAlbum(albumId) }
        saveAlbum(album)
        return true
    }

    suspend fun syncAlbum(album: PlaybackAlbum) {
        if (albums[album.albumId]?.whole == true) saveAlbum(album)
    }

    private suspend fun saveAlbum(album: PlaybackAlbum) {
        val quality = settings.downloadQuality
        val rows =
            album.tracks.mapIndexedNotNull { position, track ->
                val file = downloadFile(track, quality) ?: return@mapIndexedNotNull null
                track.toRow(position, file, played = false)
            }
        dao.saveAlbum(
            album =
                OfflineAlbumEntity(
                    albumId = album.albumId,
                    whole = true,
                    title = album.title,
                    artists = album.artists,
                    coverUrl = album.coverUrl,
                    downloadedAt = System.currentTimeMillis(),
                ),
            rows = rows,
            keepFileIds =
                album.tracks.associate { track ->
                    track.trackId to
                        listOfNotNull(track.original, track.opus96)
                            .filter { it.playable }
                            .map { it.id }
                            .toSet()
                },
        )
        cleanUp()
        schedule()
    }

    fun savePlayed(
        track: PlaybackTrack,
        file: AudioFile,
    ) {
        scope.launch {
            awaitLoaded()
            val added =
                dao.savePlayed(
                    album =
                        OfflineAlbumEntity(
                            albumId = track.albumId,
                            whole = false,
                            title = track.albumTitle,
                            artists = null,
                            coverUrl = track.coverUrl,
                            downloadedAt = System.currentTimeMillis(),
                        ),
                    row = track.toRow(-1, file, played = true),
                )
            if (!added) return@launch
            schedule()
            if (details.syncAlbum(track.albumId)) {
                details.album(track.albumId).first()?.let { album ->
                    dao.updateAlbumDetails(
                        albumId = album.id,
                        title = album.title,
                        artists =
                            album.credits
                                .map { it.name }
                                .distinct()
                                .joinToString(", ")
                                .ifEmpty { null },
                        coverUrl = album.coverUrl ?: track.coverUrl,
                    )
                }
            }
        }
    }

    suspend fun downloadPlaylist(playlistId: Long): Boolean {
        val playlist = api.fetchPlaylist(playlistId).valueOrNull() ?: return false
        val quality = settings.downloadQuality
        val tracks =
            playlist.tracks
                .distinctBy { it.trackId }
                .mapNotNull { track -> downloadFile(track, quality)?.let { track to it } }
        if (tracks.isEmpty()) return false
        dao.savePlaylist(
            playlist =
                OfflinePlaylistEntity(
                    playlistId = playlist.playlistId,
                    name = playlist.name,
                    coverUrl = playlist.tracks.firstNotNullOfOrNull { it.coverUrl },
                    downloadedAt = System.currentTimeMillis(),
                ),
            entries =
                playlist.tracks.mapIndexed { position, track ->
                    OfflinePlaylistTrackEntity(playlist.playlistId, position, track.trackId)
                },
            albums =
                tracks
                    .map { (track) ->
                        OfflineAlbumEntity(
                            albumId = track.albumId,
                            whole = false,
                            title = track.albumTitle,
                            artists = null,
                            coverUrl = track.coverUrl,
                            downloadedAt = System.currentTimeMillis(),
                        )
                    }.distinctBy { it.albumId },
            rows = tracks.map { (track, file) -> track.toRow(-1, file, played = false) },
        )
        cleanUp()
        schedule()
        return true
    }

    fun retryAlbum(albumId: Long) = retry(tracks.values.filter { it.albumId == albumId }.map { it.trackId })

    fun retryPlaylist(playlist: OfflinePlaylist) = retry(playlist.trackIds)

    private fun retry(trackIds: List<Long>) {
        scope.launch {
            dao.retry(trackIds)
            schedule()
        }
    }

    fun remove(
        albumIds: List<Long>,
        playlistIds: List<Long>,
    ) {
        scope.launch {
            if (playlistIds.isNotEmpty()) dao.removePlaylists(playlistIds)
            if (albumIds.isNotEmpty()) dao.removeAlbums(albumIds)
            cleanUp()
        }
    }

    private suspend fun cleanUp() {
        dao.prune()
        activeDownloads.forEach { if (!dao.hasDownload(it.trackId, it.fileId)) it.job.cancel() }
        val audio = dao.audioFileNames().toSet()
        val urls =
            dao
                .trackCoverUrls()
                .plus(dao.observeAlbums().first().mapNotNull { it.coverUrl })
                .plus(dao.observePlaylists().first().mapNotNull { it.coverUrl })
                .distinct()
        dao.deleteArtworkExcept(urls)
        val artwork = dao.artwork().map { it.fileName }.toSet()
        withContext(Dispatchers.IO) {
            audioDirectory
                .listFiles()
                ?.filter { it.name !in audio && it.name !in activeFiles }
                ?.forEach { it.delete() }
            artworkDirectory
                .listFiles()
                ?.filter { it.name !in artwork && it.name !in activeFiles }
                ?.forEach { it.delete() }
        }
    }

    fun schedule(replace: Boolean = false) {
        val network = if (settings.downloadOnMobileData) NetworkType.CONNECTED else NetworkType.UNMETERED
        enqueue(DOWNLOAD_WORK, network, upgrade = false, replace)
    }

    fun scheduleUpgrades() {
        if (settings.upgradeOnWifi) enqueue(UPGRADE_WORK, NetworkType.UNMETERED, upgrade = true, replace = false)
    }

    private fun enqueue(
        name: String,
        network: NetworkType,
        upgrade: Boolean,
        replace: Boolean,
    ) {
        val request =
            OneTimeWorkRequestBuilder<DownloadWorker>()
                .setConstraints(Constraints.Builder().setRequiredNetworkType(network).build())
                .setInputData(workDataOf(DownloadWorker.UPGRADE_KEY to upgrade))
                .build()
        val policy = if (replace) ExistingWorkPolicy.REPLACE else ExistingWorkPolicy.APPEND_OR_REPLACE
        workManager.enqueueUniqueWork(name, policy, request)
    }

    internal suspend fun runPending(onTrack: suspend (PlaybackTrack, Int) -> Unit) {
        awaitLoaded()
        var playedSaved = false
        while (true) {
            val pending = dao.nextPending() ?: break
            val row = pending.download
            val download = pending.toDownload()
            onTrack(download.track, dao.pendingCount())
            dao.updateStatus(row.trackId, row.fileId, DownloadStatus.Downloading, null)
            try {
                cancellable(row.trackId, row.fileId) {
                    holding(download.file) {
                        val size = fetch(row.trackId, row.fileId, download.file, showProgress = true)
                        dao.markDownloaded(row.trackId, row.fileId, size)
                    }
                }
                playedSaved = playedSaved || row.played
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                dao.updateStatus(row.trackId, row.fileId, DownloadStatus.Failed, e.message ?: "Download failed")
            } finally {
                progress = progress - row.trackId
            }
        }
        fetchArtwork()
        cleanUp()
        if (playedSaved) scheduleUpgrades()
    }

    // Replaces played tracks saved below Original with the original, keeping the saved
    // file until the original has fully downloaded.
    internal suspend fun runUpgrades() {
        awaitLoaded()
        for (candidate in dao.upgradeCandidates()) {
            if (!settings.upgradeOnWifi) return
            val row = candidate.download
            val track = candidate.toDownload().track
            val original = track.original
            if (original.id == row.fileId || !original.playable) continue
            val target = File(audioDirectory, original.fileName())
            try {
                cancellable(row.trackId, row.fileId) {
                    holding(target) {
                        val size = fetch(row.trackId, original.id, target, showProgress = false)
                        dao.replaceFile(row.trackId, row.fileId, original.id, target.name, size)
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
            }
        }
        cleanUp()
    }

    private suspend fun fetchArtwork() {
        val stored = dao.artwork().map { it.url }.toSet()
        val urls =
            (
                tracks.values.mapNotNull { it.track.coverUrl } + albums.values.mapNotNull { it.coverUrl } +
                    playlists.mapNotNull { it.coverUrl }
            ).distinct().filter { it !in stored }
        for (url in urls) {
            val target = File(artworkDirectory, url.sha1())
            try {
                holding(target) {
                    download(url, target) {}
                    dao.upsertArtwork(OfflineArtworkEntity(url, target.name))
                }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
            }
        }
    }

    private suspend fun <T> holding(
        target: File,
        block: suspend () -> T,
    ): T {
        val names = listOf(target.name, "${target.name}.part")
        activeFiles += names
        try {
            return block()
        } finally {
            activeFiles -= names.toSet()
        }
    }

    // Runs a track's download so removing that download cancels it, without stopping the worker.
    private suspend fun cancellable(
        trackId: Long,
        fileId: String,
        block: suspend () -> Unit,
    ) = coroutineScope {
        val job = launch(start = CoroutineStart.LAZY) { block() }
        val active = ActiveDownload(trackId, fileId, job)
        activeDownloads += active
        try {
            job.start()
            job.join()
        } finally {
            activeDownloads -= active
        }
    }

    // Downloads a FileObject unless it is already on disk; tracks can share one.
    private suspend fun fetch(
        trackId: Long,
        fileId: String,
        target: File,
        showProgress: Boolean,
    ): Long {
        if (target.exists()) return target.length()
        val url = api.fileUrl(fileId)
        var lastFraction = 0f
        download(url, target) { fraction ->
            if (showProgress && fraction - lastFraction >= PROGRESS_STEP) {
                lastFraction = fraction
                progress = progress + (trackId to fraction)
            }
        }
        return target.length()
    }

    private suspend fun download(
        url: String,
        target: File,
        onProgress: suspend (Float) -> Unit,
    ) {
        val partial = File(target.parentFile, "${target.name}.part")
        withContext(Dispatchers.IO) { target.parentFile?.mkdirs() }
        try {
            http.prepareGet(url).execute { response ->
                if (!response.status.isSuccess()) throw IOException("Server returned ${response.status.value}")
                val total = response.headers["Content-Length"]?.toLongOrNull() ?: 0L
                val channel = response.bodyAsChannel()
                val buffer = ByteArray(BUFFER_SIZE)
                var written = 0L
                withContext(Dispatchers.IO) {
                    partial.outputStream().use { output ->
                        while (true) {
                            val read = channel.readAvailable(buffer, 0, buffer.size)
                            if (read == -1) break
                            output.write(buffer, 0, read)
                            written += read
                            if (total > 0) onProgress(written.toFloat() / total)
                        }
                    }
                }
            }
            withContext(Dispatchers.IO) {
                if (!partial.renameTo(target)) throw IOException("Couldn't save the download")
            }
        } finally {
            withContext(Dispatchers.IO) { partial.delete() }
        }
    }

    // An unplayable original, e.g. DSF, falls back to Opus like streaming.
    private fun downloadFile(
        track: PlaybackTrack,
        quality: AudioQuality,
    ): AudioFile? {
        val preferred = if (quality == AudioQuality.Original) track.original else track.opus96 ?: track.original
        return listOfNotNull(preferred, track.opus96, track.original).firstOrNull { it.playable }
    }

    private fun PlaybackTrack.toRow(
        position: Int,
        file: AudioFile,
        played: Boolean,
    ) = StoredDownload(
        download =
            TrackDownloadEntity(
                trackId = trackId,
                albumId = albumId,
                position = position,
                track = toStored(),
                fileId = file.id,
                fileName = file.fileName(),
                sizeInBytes = file.sizeInBytes,
                status = DownloadStatus.Queued,
                error = null,
                played = played,
            ),
        artists = artists.mapIndexed { index, artist -> TrackDownloadArtistEntity(trackId, index, artist.partyId, artist.name) },
    )

    private fun StoredDownload.toDownload() =
        TrackDownload(
            trackId = download.trackId,
            albumId = download.albumId,
            position = download.position,
            track =
                download.track.toPlaybackTrack(
                    trackId = download.trackId,
                    albumId = download.albumId,
                    artists = artists.sortedBy { it.position }.map { TrackArtist(it.partyId, it.name) },
                ),
            fileId = download.fileId,
            file = File(audioDirectory, download.fileName),
            sizeInBytes = download.sizeInBytes,
            status = download.status,
            error = download.error,
            played = download.played,
        )

    private fun stats(rows: List<TrackDownload>) =
        DownloadStats(
            total = rows.size,
            downloaded = rows.count { it.status == DownloadStatus.Downloaded },
            failed = rows.count { it.status == DownloadStatus.Failed },
            sizeInBytes = rows.filter { it.status == DownloadStatus.Downloaded }.sumOf { it.sizeInBytes },
        )

    private companion object {
        const val DOWNLOAD_WORK = "downloads"
        const val UPGRADE_WORK = "downloadUpgrades"
        const val BUFFER_SIZE = 64 * 1024
        const val PROGRESS_STEP = 0.01f
    }
}

private fun AudioFile.fileName() = "$id.${extension.trimStart('.').lowercase()}"

private fun String.sha1(): String = MessageDigest.getInstance("SHA-1").digest(toByteArray()).joinToString("") { "%02x".format(it) }
