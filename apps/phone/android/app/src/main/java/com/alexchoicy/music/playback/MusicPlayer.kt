package com.alexchoicy.music.playback

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.core.content.edit
import androidx.core.net.toUri
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.ResolvingDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.source.ShuffleOrder.DefaultShuffleOrder
import com.alexchoicy.music.Notices
import com.alexchoicy.music.api.AudioFile
import com.alexchoicy.music.api.PlaybackApi
import com.alexchoicy.music.api.PlaybackTrack
import com.alexchoicy.music.api.valueOrNull
import com.alexchoicy.music.offline.DownloadStatus
import com.alexchoicy.music.offline.Downloads
import io.sentry.Sentry
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import java.io.IOException
import kotlin.coroutines.resume
import kotlin.math.min
import kotlin.random.Random
import kotlin.time.Duration.Companion.milliseconds

enum class PlayerStatus { Idle, Playing, Paused }

data class PlaybackSource(
    val file: AudioFile,
    val local: Boolean,
)

private class UnplayableException(
    message: String,
) : Exception(message)

private const val FILE_SCHEME = "musicfile"
private const val TICK_MS = 1_000L
private const val POSITION_SAVE_MS = 15_000L

private const val RESTART_THRESHOLD_MS = 3_000L
private const val MAX_LISTEN_THRESHOLD_MS = 4 * 60 * 1000L

private const val MAX_PROGRESS_STEP_MS = 2_000L
private const val TRANSFER_READY_TIMEOUT_MS = 20_000L
private const val QUEUE_SAVE_DELAY_MS = 300L
private const val ALBUM_FETCH_TIMEOUT_MS = 3_000L

private const val PREVIOUS_LIMIT = 50

@androidx.annotation.OptIn(UnstableApi::class)
class MusicPlayer(
    context: Context,
    private val api: PlaybackApi,
    val settings: PlaybackSettings,
    private val network: NetworkMonitor,
    private val downloads: Downloads,
    private val queueDao: QueueDao,
    private val notices: Notices,
    private val scope: CoroutineScope,
) {
    private val preferences = context.getSharedPreferences("player", Context.MODE_PRIVATE)

    var queue by mutableStateOf<List<QueueEntry>>(emptyList())
        private set
    var currentId by mutableStateOf<String?>(null)
        private set
    var shuffle by mutableStateOf(false)
        private set
    var repeatMode by mutableStateOf(RepeatMode.Off)
        private set

    var playOrder by mutableStateOf<List<String>>(emptyList())
        private set
    var hasNext by mutableStateOf(false)
        private set
    var status by mutableStateOf(PlayerStatus.Idle)
        private set
    var buffering by mutableStateOf(false)
        private set

    var loadingRadio by mutableStateOf(false)
        private set
    val loading get() = buffering || loadingRadio
    var error by mutableStateOf<String?>(null)
        private set
    var source by mutableStateOf<PlaybackSource?>(null)
        private set

    var stopAfterId by mutableStateOf<String?>(null)
        private set
    var durationMs by mutableLongStateOf(0)
        private set

    val current: QueueEntry? get() = queue.firstOrNull { it.entryId == currentId }
    val positionMs: Long get() = if (exo.mediaItemCount > 0) exo.currentPosition else 0

    // Counts position jumps, such as seeks and the restored queue, so paused displays refresh.
    var positionJumps by mutableIntStateOf(0)
        private set

    val previous: List<QueueEntry>
        get() {
            val id = currentId ?: return emptyList()
            val before =
                if (shuffle) {
                    val entries = queue.associateBy { it.entryId }
                    playOrder.takeWhile { it != id }.mapNotNull(entries::get)
                } else {
                    queue.takeWhile { it.entryId != id }
                }
            return before.takeLast(PREVIOUS_LIMIT)
        }

    val upcoming: List<QueueEntry>
        get() {
            val id = currentId ?: return emptyList()
            if (!shuffle) return queue.dropWhile { it.entryId != id }.drop(1)
            val ordered = playOrder.dropWhile { it != id }.drop(1)
            val orderedIds = ordered.toSet()
            val previousIds = playOrder.takeWhile { it != id }.toSet()
            val skipped =
                queue
                    .dropWhile { it.entryId != id }
                    .drop(1)
                    .filter { it.entryId !in orderedIds && it.entryId !in previousIds }
            val entries = queue.associateBy { it.entryId }
            return ordered.mapNotNull(entries::get) + skipped
        }

    private val seekEvents = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val seeks = seekEvents.asSharedFlow()

    // Each request gets an id so an outdated radio pick or transfer cannot replace a newer one.
    private var requestId = 0
    private var radioFor: String? = null
    private var radioJob: Job? = null

    // Tracks being fetched to play; a newer request cancels it so the last tap wins.
    private var loadJob: Job? = null
    private var lastNotice: String? = null
    private var listening: ListeningSession? = null
    private var lastPositionSave = 0L

    // The entry ExoPlayer last moved to, as the queue's current one is set ahead of it.
    private var playingId: String? = null

    val exo: ExoPlayer =
        ExoPlayer
            .Builder(context)
            .setMediaSourceFactory(
                DefaultMediaSourceFactory(
                    ResolvingDataSource.Factory(DefaultDataSource.Factory(context)) { spec ->
                        if (spec.uri.scheme != FILE_SCHEME) return@Factory spec
                        val fileId =
                            spec.uri.lastPathSegment
                                ?: throw IOException("Couldn't resolve ${spec.uri}")
                        // Streaming URLs are short-lived, so they are fetched when the file opens.
                        val url =
                            try {
                                runBlocking { api.fileUrl(fileId) }
                            } catch (e: Exception) {
                                throw IOException("Couldn't resolve ${spec.uri}", e)
                            }
                        spec.withUri(url.toUri())
                    },
                ),
            ).setAudioAttributes(
                AudioAttributes
                    .Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .build(),
                true,
            ).setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .build()

    init {
        exo.addListener(
            object : Player.Listener {
                override fun onMediaItemTransition(
                    mediaItem: MediaItem?,
                    reason: Int,
                ) = transitioned(mediaItem, reason)

                override fun onPlaybackStateChanged(playbackState: Int) {
                    if (playbackState == Player.STATE_ENDED) queueEnded()
                }

                override fun onPlayWhenReadyChanged(
                    playWhenReady: Boolean,
                    reason: Int,
                ) {
                    if (reason == Player.PLAY_WHEN_READY_CHANGE_REASON_END_OF_MEDIA_ITEM) stopReached()
                }

                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    if (isPlaying) prefetchRadio() else savePosition()
                }

                override fun onPositionDiscontinuity(
                    oldPosition: Player.PositionInfo,
                    newPosition: Player.PositionInfo,
                    reason: Int,
                ) {
                    positionJumps++
                }

                override fun onPlayerError(playbackError: PlaybackException) = failed(playbackError)

                override fun onEvents(
                    player: Player,
                    events: Player.Events,
                ) {
                    if (events.containsAny(
                            Player.EVENT_TIMELINE_CHANGED,
                            Player.EVENT_SHUFFLE_MODE_ENABLED_CHANGED,
                            Player.EVENT_REPEAT_MODE_CHANGED,
                        )
                    ) {
                        readOrder()
                    }
                    sync()
                }
            },
        )
        scope.launch {
            val saved =
                queueDao
                    .load()
                    .takeIf { saved -> saved.currentEntryId == null || saved.entries.any { it.entryId == saved.currentEntryId } }
                    ?: SavedQueue()
            // Downloads decide where each file comes from, so the restored queue waits for them.
            downloads.awaitLoaded()
            // Something may already be playing if it was started straight away.
            if (exo.mediaItemCount != 0 || requestId != 0 || queue.isNotEmpty()) return@launch
            queue = saved.entries
            currentId = saved.currentEntryId
            shuffle = saved.shuffle
            repeatMode = saved.repeatMode
            restore(saved.playOrder)
        }
        scope.launch {
            snapshotFlow { SavedQueue(queue, currentId, repeatMode, shuffle, playOrder) }
                .drop(1)
                .collectLatest {
                    delay(QUEUE_SAVE_DELAY_MS.milliseconds)
                    queueDao.save(it)
                }
        }
        scope.launch {
            // Includes Auto moving between Wi-Fi and mobile data.
            snapshotFlow { settings.resolvedStreamQuality }.drop(1).collect { reloadForQuality() }
        }
        scope.launch {
            snapshotFlow { settings.savePlayedTracks }.drop(1).collect { if (it) savePlayed() }
        }
        scope.launch {
            snapshotFlow { settings.radio }.drop(1).collect { if (!it) dropRadioEntries() }
        }
        scope.launch {
            snapshotFlow {
                listOf(
                    settings.resolvedStreamQuality,
                    settings.playTalkTracks,
                    settings.playInstrumentals,
                    network.online,
                    downloads.tracks,
                )
            }.drop(1).collect { syncPlaylist() }
        }
        scope.launch {
            while (isActive) {
                delay(TICK_MS.milliseconds)
                if (!exo.isPlaying) continue
                trackListening(exo.currentPosition)
                if (System.currentTimeMillis() - lastPositionSave >= POSITION_SAVE_MS) savePosition()
            }
        }
    }

    fun isCurrent(
        albumId: Long,
        trackId: Long,
    ) = current?.track?.let { it.albumId == albumId && it.trackId == trackId } == true

    // Whether an entry can be picked now: downloaded, or online to stream it.
    fun isAvailable(entry: QueueEntry) = network.online || downloads.isDownloaded(entry.track.trackId)

    // Talk and Instrumental tracks are skipped automatically unless enabled, like the web player.
    fun isAutoPlayable(entry: QueueEntry) =
        canPlay(entry.track) &&
            (settings.playTalkTracks || entry.track.contentType != "MC") &&
            (settings.playInstrumentals || entry.track.versionType != "Instrumental")

    fun playAlbum(
        albumId: Long,
        startTrackId: Long? = null,
        shuffle: Boolean? = null,
        positionMs: Long = 0,
    ) = load {
        val tracks = albumTracks(albumId)
        if (tracks.isEmpty()) {
            notices.show("Couldn't play album")
            return@load
        }
        val start = startTrackId?.let { id -> tracks.indexOfFirst { it.trackId == id } }
        if (start != null && start < 0) {
            notices.show(if (network.online) "Couldn't play this track" else "This track isn't downloaded")
            return@load
        }
        playTracks(tracks, start, shuffle, positionMs)
    }

    fun playAlbums(
        albumIds: List<Long>,
        name: String,
        shuffle: Boolean = false,
    ) = load {
        val tracks = albumsTracks(albumIds)
        if (tracks.isEmpty()) {
            notices.show("Couldn't play $name")
        } else {
            playTracks(
                tracks,
                null,
                shuffle,
            )
        }
    }

    // tracks is null when the playlist couldn't load.
    fun playPlaylist(
        startIndex: Int? = null,
        shuffle: Boolean? = null,
        tracks: suspend () -> List<PlaybackTrack>?,
    ) = load {
        val loaded = tracks()
        when {
            loaded == null -> notices.show("Couldn't play. Check your connection and try again.")
            loaded.isEmpty() -> notices.show("Couldn't play. This playlist has no playable tracks.")
            else -> playTracks(loaded, startIndex, shuffle)
        }
    }

    fun queueAlbum(
        albumId: Long,
        next: Boolean,
        trackId: Long? = null,
    ) {
        scope.launch {
            val tracks = albumTracks(albumId).filter { trackId == null || it.trackId == trackId }
            when {
                tracks.isEmpty() -> notices.show(if (trackId == null) "Couldn't add album" else "Couldn't add track")
                next -> playNext(tracks)
                else -> addToQueue(tracks)
            }
        }
    }

    fun addToQueue(tracks: List<PlaybackTrack>) {
        if (tracks.isEmpty()) return
        val entries = tracks.toQueueEntries()
        queue = queue + entries
        if (currentId == null) currentId = entries.first().entryId
        syncPlaylist()
        notices.show(if (tracks.size == 1) "Added to queue" else "Added ${tracks.size} tracks to queue")
    }

    fun playNext(tracks: List<PlaybackTrack>) {
        if (tracks.isEmpty()) return
        val entries = tracks.toQueueEntries()
        val at = queue.indexOfFirst { it.entryId == currentId } + 1
        queue = queue.toMutableList().apply { addAll(at, entries) }
        if (currentId == null) currentId = entries.first().entryId
        syncPlaylist(next = entries.map { it.entryId })
        notices.show(if (tracks.size == 1) "Playing next" else "Playing ${tracks.size} tracks next")
    }

    fun removeEntry(entryId: String) {
        val index = queue.indexOfFirst { it.entryId == entryId }
        if (index < 0) return
        if (queue.size == 1) {
            clearQueue()
            return
        }
        if (entryId == currentId) {
            // ExoPlayer moves on to the entry that was next; otherwise the list's next one.
            val exoIndex = exoIndex(entryId)
            val fallback = queue.getOrNull(index + 1) ?: queue[index - 1]
            queue = queue - queue[index]
            if (exoIndex < 0 || exo.mediaItemCount == 1) {
                currentId = fallback.entryId
                syncPlaylist()
                return
            }
            if (!exo.hasNextMediaItem()) {
                // Removing the last item would end playback, so step back to the previous one first, paused.
                val previous = exo.previousMediaItemIndex
                exo.pause()
                if (previous == C.INDEX_UNSET) {
                    currentId = fallback.entryId
                    exo.clearMediaItems()
                    syncPlaylist()
                    return
                }
                exo.seekTo(previous, 0)
            }
            exo.removeMediaItem(exoIndex(entryId))
        } else {
            queue = queue - queue[index]
        }
        syncPlaylist()
    }

    fun clearQueue() {
        cancelPending()
        queue = emptyList()
        currentId = null
        stopAfterId = null
        error = null
        source = null
        listening = null
        exo.clearMediaItems()
        sync()
    }

    fun playEntry(entryId: String) {
        val entry = entry(entryId) ?: return
        val source =
            try {
                resolveSource(entry.track)
            } catch (e: UnplayableException) {
                notices.show(e.message.orEmpty())
                return
            }
        cancelPending()
        // A tapped entry plays even if automatic playback skips it.
        syncPlaylist(keep = entryId)
        val index = exoIndex(entryId)
        if (index < 0) return
        if (exo.currentMediaItemIndex == index) {
            exo.seekTo(0)
            listening = ListeningSession(entry.track)
            this.source = source
        } else {
            exo.seekTo(index, 0)
        }
        startPlayback()
    }

    fun skipNext() {
        cancelPending()
        when {
            exo.hasNextMediaItem() -> {
                exo.seekToNextMediaItem()
                startPlayback()
            }

            settings.radio && queue.isNotEmpty() -> playRadio()
        }
    }

    fun skipPrevious() {
        cancelPending()
        if (!exo.hasPreviousMediaItem() || exo.mediaItemCount > 0 && exo.currentPosition > RESTART_THRESHOLD_MS) {
            seekTo(0)
            return
        }
        exo.seekToPreviousMediaItem()
        startPlayback()
    }

    fun play() {
        val entry = current ?: return
        if (exoIndex(entry.entryId) < 0) {
            // e.g. offline with a current entry that isn't downloaded.
            val message = runCatching { resolveSource(entry.track) }.exceptionOrNull()?.message
            notices.show(message ?: "Couldn't play ${entry.track.title}")
            return
        }
        if (exo.playbackState == Player.STATE_ENDED) exo.seekTo(exo.currentMediaItemIndex, 0)
        startPlayback()
    }

    fun pause() = exo.pause()

    fun togglePlayback() = if (status == PlayerStatus.Playing) pause() else play()

    fun seekTo(positionMs: Long) {
        if (exo.mediaItemCount == 0) return
        if (!useDownload(positionMs)) exo.seekTo(positionMs)
        savePosition(positionMs)
        seekEvents.tryEmit(Unit)
    }

    fun toggleShuffle() {
        exo.shuffleModeEnabled = !exo.shuffleModeEnabled
        // The current entry starts the new order, so everything else is still to come.
        if (exo.shuffleModeEnabled) applyPlayOrder(listOfNotNull(currentId) + playOrder.shuffled())
    }

    fun cycleRepeatMode() {
        exo.repeatMode =
            when (repeatMode) {
                RepeatMode.Off -> Player.REPEAT_MODE_ALL
                RepeatMode.All -> Player.REPEAT_MODE_ONE
                RepeatMode.One -> Player.REPEAT_MODE_OFF
            }
        prefetchRadio()
    }

    // Moves an entry within Next up; positions are in the upcoming list.
    fun moveUpcoming(
        from: Int,
        to: Int,
    ) {
        val upcoming = upcoming
        if (from == to || minOf(from, to) < 0 || maxOf(from, to) >= upcoming.size) return
        val reordered = upcoming.toMutableList().apply { add(to, removeAt(from)) }
        if (!shuffle) {
            val before = queue.takeWhile { it.entryId != currentId } + listOfNotNull(current)
            queue = before + reordered
            syncPlaylist()
        } else {
            // The shuffle order is the play order, so it is reordered instead of the list.
            applyPlayOrder(playOrder.takeWhile { it != currentId } + listOfNotNull(currentId) + reordered.map { it.entryId })
        }
    }

    // Sets the stop after an entry, or removes it when it is already there.
    fun toggleStopAfter(entryId: String) {
        stopAfterId = if (stopAfterId == entryId) null else entryId
        updateStopAfter()
        prefetchRadio()
    }

    fun savePosition(positionMs: Long = exo.currentPosition) {
        val entry = current ?: return
        // Otherwise the player holds no position, or an earlier entry's.
        if (exo.mediaItemCount == 0 || error != null || exo.currentMediaItem?.mediaId != entry.entryId) return
        lastPositionSave = System.currentTimeMillis()
        preferences.edit {
            putString(POSITION_ENTRY_KEY, entry.entryId)
            putLong(POSITION_MS_KEY, positionMs.coerceAtLeast(0))
        }
    }

    // The queue and position to move to another device; null when nothing is queued.
    fun transferSnapshot(): TransferSnapshot? {
        val index = queue.indexOfFirst { it.entryId == currentId }
        if (index < 0) return null
        return TransferSnapshot(
            tracks = queue.map { it.track },
            index = index,
            positionMs = positionMs,
            playing = status == PlayerStatus.Playing,
        )
    }

    // Takes over playback moved from another device and plays it; on failure this phone's queue is restored.
    suspend fun adoptTransfer(snapshot: TransferSnapshot): Boolean {
        downloads.awaitLoaded()
        loadJob?.cancel()
        val previous = SavedQueue(queue, currentId, repeatMode, shuffle, playOrder)
        val previousPosition = positionMs
        val previousStopAfter = stopAfterId
        val loaded =
            replaceQueue(
                snapshot.tracks.toQueueEntries(),
                snapshot.index,
                shuffle,
                snapshot.positionMs,
            )
        val id = requestId
        // Another queue may have replaced this one meanwhile, e.g. an album played here.
        if (loaded && awaitReady() && id == requestId) return true
        if (id != requestId) return false
        queue = previous.entries
        currentId = previous.currentEntryId
        stopAfterId = previousStopAfter
        error = null
        exo.clearMediaItems()
        restore(previous.playOrder, previousPosition)
        return false
    }

    // Stops here after another device took over; the queue stays.
    fun stopForTransfer() {
        cancelPending()
        exo.pause()
    }

    private fun entry(entryId: String) = queue.firstOrNull { it.entryId == entryId }

    private fun exoIndex(entryId: String): Int {
        for (i in 0 until exo.mediaItemCount) if (exo.getMediaItemAt(i).mediaId == entryId) return i
        return -1
    }

    private fun exoIndices(): Map<String, Int> {
        val indices = HashMap<String, Int>(exo.mediaItemCount)
        for (i in exo.mediaItemCount - 1 downTo 0) indices[exo.getMediaItemAt(i).mediaId] = i
        return indices
    }

    private fun load(block: suspend () -> Unit) {
        loadJob?.cancel()
        loadJob = scope.launch { block() }
    }

    // Drops work started for an earlier request, so it can't replace what was asked for since.
    private fun cancelPending() {
        loadJob?.cancel()
        cancelRadio()
    }

    private fun cancelRadio() {
        requestId++
        radioJob?.cancel()
        loadingRadio = false
    }

    // Without a chosen start, playback starts on a track automatic playback would pick.
    private fun playTracks(
        tracks: List<PlaybackTrack>,
        startIndex: Int?,
        shuffle: Boolean?,
        positionMs: Long = 0,
    ) {
        val entries = tracks.toQueueEntries()
        val start =
            startIndex?.coerceIn(entries.indices) ?: run {
                val playable =
                    entries.indices
                        .filter { isAutoPlayable(entries[it]) }
                        .ifEmpty { entries.indices.toList() }
                if (shuffle == true) playable.random() else playable.first()
            }
        replaceQueue(entries, start, shuffle ?: this.shuffle, positionMs)
    }

    private fun startPlayback() {
        error = null
        if (exo.playbackState == Player.STATE_IDLE) exo.prepare()
        exo.play()
    }

    private fun replaceQueue(
        entries: List<QueueEntry>,
        start: Int,
        shuffle: Boolean,
        positionMs: Long,
    ): Boolean {
        val entry = entries[start]
        try {
            resolveSource(entry.track)
        } catch (e: UnplayableException) {
            notices.show(e.message.orEmpty())
            return false
        }
        cancelRadio()
        error = null
        stopAfterId = null
        queue = entries
        currentId = entry.entryId
        exo.shuffleModeEnabled = shuffle
        exo.clearMediaItems()
        syncPlaylist()
        val index = exoIndex(entry.entryId)
        // The first entry starts the shuffle order, so the rest are all still to come.
        if (shuffle) applyPlayOrder(listOf(entry.entryId) + playOrder.shuffled())
        exo.seekTo(index, positionMs)
        exo.playWhenReady = true
        exo.prepare()
        listening = ListeningSession(entry.track)
        return true
    }

    // Loads the saved queue, paused, so playing continues where it stopped.
    private fun restore(
        order: List<String>,
        positionMs: Long? = null,
    ) {
        val entry = current ?: return
        val id = entry.entryId
        exo.shuffleModeEnabled = shuffle
        exo.repeatMode = repeatMode.toExo()
        syncPlaylist()
        val index = exoIndex(id)
        if (index < 0) return
        if (shuffle) applyPlayOrder(order)
        val position =
            positionMs
                ?: preferences
                    .getLong(POSITION_MS_KEY, 0)
                    .takeIf { preferences.getString(POSITION_ENTRY_KEY, null) == id }
                ?: 0
        exo.seekTo(index, position)
        exo.playWhenReady = false
        source = runCatching { resolveSource(entry.track) }.getOrNull()
        listening = ListeningSession(entry.track)
    }

    // Brings ExoPlayer's playlist in line with the queue: entries that may play
    // automatically, in list order, plus the current one. Items are added, moved, or
    // replaced in place so the current track keeps playing.
    private fun syncPlaylist(
        next: List<String> = emptyList(),
        keep: String? = null,
    ) {
        val keep = setOfNotNull(currentId, exo.currentMediaItem?.mediaId, keep)
        val order = playOrder
        val exoIds = exoIndices().keys
        val desired =
            queue.mapNotNull { entry ->
                if (entry.entryId !in keep && !isAutoPlayable(entry)) return@mapNotNull null
                val source = runCatching { resolveSource(entry.track) }.getOrNull()
                when {
                    source != null -> entry.entryId to entry.toMediaItem(source)
                    // The current entry stays even if it can't play now, e.g. offline.
                    entry.entryId in exoIds -> entry.entryId to null
                    else -> null
                }
            }
        val desiredIds = desired.map { it.first }.toSet()
        for (i in exo.mediaItemCount - 1 downTo 0) {
            if (exo.getMediaItemAt(i).mediaId !in desiredIds) exo.removeMediaItem(i)
        }
        val added = mutableListOf<String>()
        var reshuffled = false
        desired.forEachIndexed { target, (id, item) ->
            var at = -1
            for (i in target until exo.mediaItemCount) {
                if (exo.getMediaItemAt(i).mediaId == id) {
                    at = i
                    break
                }
            }
            when {
                at == -1 && item != null -> {
                    exo.addMediaItem(target, item)
                    added += id
                }

                at == -1 -> Unit
                at != target -> {
                    exo.moveMediaItem(at, target)
                    reshuffled = true
                }
            }
            val placed = exo.getMediaItemAt(minOf(target, exo.mediaItemCount - 1))
            if (item != null &&
                placed.mediaId == id &&
                target != exo.currentMediaItemIndex &&
                placed.localConfiguration?.uri != item.localConfiguration?.uri
            ) {
                exo.replaceMediaItem(target, item)
                reshuffled = true
            }
        }
        // Moved and replaced items land at random in ExoPlayer's shuffle order.
        if (exo.shuffleModeEnabled && reshuffled) applyPlayOrder(order)
        if (exo.shuffleModeEnabled && (added.isNotEmpty() || next.isNotEmpty())) {
            readOrder()
            placeInShuffle(added - next.toSet(), next)
        }
        readOrder()
        // A stop after an entry that won't play anymore, e.g. removed or now skipped, goes away.
        if (stopAfterId != null && stopAfterId !in playOrder) stopAfterId = null
        updateStopAfter()
        sync()
        prefetchRadio()
    }

    // New entries join the rest of the shuffle at random; Play next ones come first.
    private fun placeInShuffle(
        random: List<String>,
        next: List<String>,
    ) {
        val id = currentId
        val moved = (random + next).toSet()
        val remaining = playOrder.filter { it !in moved }
        val before = remaining.takeWhile { it != id } + listOfNotNull(id.takeIf { it in remaining })
        val after = remaining.drop(before.size).toMutableList()
        random.forEach { after.add(Random.nextInt(after.size + 1), it) }
        val exoIds = exoIndices().keys
        applyPlayOrder(before + next.filter { it in exoIds } + after)
    }

    private fun applyPlayOrder(order: List<String>) {
        val exoIndices = exoIndices()
        val indices = mutableListOf<Int>()
        val seen = mutableSetOf<Int>()
        order.forEach { id ->
            val index = exoIndices[id] ?: return@forEach
            if (seen.add(index)) indices += index
        }
        (0 until exo.mediaItemCount).filter { it !in seen }.forEach { indices += it }
        exo.shuffleOrder = DefaultShuffleOrder(indices.toIntArray(), Random.nextLong())
        readOrder()
    }

    private fun readOrder() {
        val timeline = exo.currentTimeline
        val order = mutableListOf<String>()
        if (!timeline.isEmpty) {
            var index = timeline.getFirstWindowIndex(exo.shuffleModeEnabled)
            while (index != C.INDEX_UNSET) {
                order += exo.getMediaItemAt(index).mediaId
                index =
                    timeline.getNextWindowIndex(
                        index,
                        Player.REPEAT_MODE_OFF,
                        exo.shuffleModeEnabled,
                    )
            }
        }
        playOrder = order
        shuffle = exo.shuffleModeEnabled
        repeatMode =
            when (exo.repeatMode) {
                Player.REPEAT_MODE_ONE -> RepeatMode.One
                Player.REPEAT_MODE_ALL -> RepeatMode.All
                else -> RepeatMode.Off
            }
    }

    private fun transitioned(
        item: MediaItem?,
        reason: Int,
    ) {
        val finished = current
        val id = item?.mediaId
        val changed = id != playingId
        playingId = id
        if (id != null) currentId = id
        val entry = current ?: return
        updateStopAfter()
        if (changed || reason == Player.MEDIA_ITEM_TRANSITION_REASON_REPEAT) {
            listening = ListeningSession(entry.track)
        }
        if (changed) {
            error = null
            source = runCatching { resolveSource(entry.track) }.getOrNull()
            source?.let { showNotice(entry, it) }
            savePlayed()
            seekEvents.tryEmit(Unit)
            // The entry that just finished may now be skipped, e.g. a tapped Talk track.
            scope.launch { syncPlaylist() }
        } else {
            prefetchRadio()
        }
    }

    // Pauses at the end of the current entry when the stop is after it.
    private fun updateStopAfter() {
        exo.pauseAtEndOfMediaItems = stopAfterId != null && stopAfterId == currentId
    }

    // Playback stopped at the stop: the next entry waits at its start until play.
    private fun stopReached() {
        stopAfterId = null
        updateStopAfter()
        if (exo.hasNextMediaItem()) {
            exo.seekToNextMediaItem()
        } else {
            exo.seekTo(
                exo.currentMediaItemIndex,
                0,
            )
        }
    }

    private fun queueEnded() {
        // Clearing ExoPlayer's items also ends it.
        if (exo.mediaItemCount == 0) return
        if (settings.radio && network.online) playRadio() else finish()
    }

    // The queue ran out: stays on the last entry, paused at its start.
    private fun finish() {
        exo.pause()
        exo.seekTo(exo.currentMediaItemIndex, 0)
    }

    private fun failed(playbackError: PlaybackException) {
        val entry = current ?: return
        if (source?.local == true || network.online) report(playbackError, entry)
        if (useDownload(exo.currentPosition)) {
            exo.prepare()
            return
        }
        val message =
            if (source?.local == false && !network.online) {
                "Couldn't play ${entry.track.title}. It isn't downloaded."
            } else {
                "Couldn't play ${entry.track.title}"
            }
        savePosition()
        error = message
        notices.show(message)
        sync()
    }

    private fun report(
        playbackError: PlaybackException,
        entry: QueueEntry,
    ) {
        val source = source
        Sentry.captureException(playbackError) { scope ->
            scope.setTag("playback.error", playbackError.errorCodeName)
            scope.setTag("playback.source", if (source?.local == true) "download" else "stream")
            source?.file?.let { file ->
                scope.setTag("playback.format", file.formatName)
                scope.setExtra("fileId", file.id)
                scope.setExtra("codec", file.codec.toString())
            }
            scope.setExtra("trackId", entry.track.trackId.toString())
            scope.setExtra("albumId", entry.track.albumId.toString())
            scope.setExtra("positionMs", exo.currentPosition.toString())
        }
    }

    // A current entry downloaded while it streamed moves to the file when it reloads anyway,
    // on a seek or a stream error, so playback doesn't skip when the download finishes.
    private fun useDownload(positionMs: Long): Boolean {
        val entry = current ?: return false
        if (source?.local == true) return false
        val local =
            runCatching { resolveSource(entry.track) }.getOrNull()?.takeIf { it.local }
                ?: return false
        val index = exoIndex(entry.entryId)
        if (index < 0) return false
        replaceCurrent(index, entry.toMediaItem(local), positionMs)
        source = local
        return true
    }

    // ExoPlayer drops a replaced current item and moves on to another entry, so the new
    // item goes in beside it and takes over before the old one is removed.
    private fun replaceCurrent(
        index: Int,
        item: MediaItem,
        positionMs: Long,
    ) {
        val order = playOrder
        exo.addMediaItem(index + 1, item)
        exo.seekTo(index + 1, positionMs)
        exo.removeMediaItem(index)
        if (exo.shuffleModeEnabled) applyPlayOrder(order)
    }

    // A new streaming quality applies right away, from the same position.
    private fun reloadForQuality() {
        val entry = current ?: return
        val source = source ?: return
        if (source.local) return
        val replacement = runCatching { resolveSource(entry.track) }.getOrNull() ?: return
        val index = exoIndex(entry.entryId)
        if (replacement.file.id == source.file.id || index < 0) return
        replaceCurrent(index, entry.toMediaItem(replacement), exo.currentPosition)
        this.source = replacement
        savePlayed()
    }

    private fun savePlayed() {
        val entry = current ?: return
        val source = source ?: return
        if (!source.local && settings.savePlayedTracks) {
            downloads.savePlayed(
                entry.track,
                source.file,
            )
        }
    }

    // Appends a track similar to the queue before it runs out. Only while playing, so
    // editing a paused queue never adds tracks.
    private fun prefetchRadio() {
        val id = currentId ?: return
        if (!exo.playWhenReady) return
        if (!settings.radio || exo.repeatMode != Player.REPEAT_MODE_OFF || !network.online) return
        if (exo.mediaItemCount == 0 || exo.hasNextMediaItem() || exo.pauseAtEndOfMediaItems) return
        if (radioFor == id || radioJob?.isActive == true) return
        radioFor = id
        radioJob =
            scope.launch {
                val track = fetchRadioTrack() ?: return@launch
                if (currentId != id || exo.hasNextMediaItem()) return@launch
                appendRadio(track)
            }
    }

    // Appends a track similar to the queue and plays it.
    private fun playRadio() {
        val id = ++requestId
        loadingRadio = true
        radioJob?.cancel()
        radioJob =
            scope.launch {
                val track = fetchRadioTrack()
                loadingRadio = false
                if (id != requestId) return@launch
                val entryId = track?.let(::appendRadio)
                val index = entryId?.let(::exoIndex) ?: -1
                if (index < 0) {
                    finish()
                    return@launch
                }
                exo.seekTo(index, 0)
                startPlayback()
            }
    }

    private fun appendRadio(track: PlaybackTrack): String {
        val entry = listOf(track).toQueueEntries().first().copy(radio = true)
        queue = queue + entry
        syncPlaylist(next = listOf(entry.entryId))
        return entry.entryId
    }

    private suspend fun fetchRadioTrack(): PlaybackTrack? =
        api.radioTrack(queue.map { it.track.trackId }, settings.playInstrumentals).valueOrNull()

    // Turning radio off drops the picks that have not played yet.
    private fun dropRadioEntries() {
        radioJob?.cancel()
        loadingRadio = false
        radioFor = null
        val upcoming = upcoming.map { it.entryId }.toSet()
        queue = queue.filter { !it.radio || it.entryId !in upcoming }
        syncPlaylist()
    }

    private suspend fun awaitReady(): Boolean =
        withTimeoutOrNull(TRANSFER_READY_TIMEOUT_MS.milliseconds) {
            suspendCancellableCoroutine { continuation ->
                fun result() =
                    when {
                        error != null || exo.playerError != null -> false
                        exo.playbackState == Player.STATE_READY -> true
                        else -> null
                    }
                result()?.let {
                    continuation.resume(it)
                    return@suspendCancellableCoroutine
                }
                val listener =
                    object : Player.Listener {
                        override fun onEvents(
                            player: Player,
                            events: Player.Events,
                        ) {
                            val ready = result() ?: return
                            exo.removeListener(this)
                            if (continuation.isActive) continuation.resume(ready)
                        }
                    }
                exo.addListener(listener)
                continuation.invokeOnCancellation { scope.launch { exo.removeListener(listener) } }
            }
        } ?: false

    // A fully downloaded album plays from the device and refreshes its download records afterwards.
    private suspend fun albumTracks(albumId: Long): List<PlaybackTrack> {
        downloads.completeAlbumTracks(albumId)?.let { tracks ->
            if (network.online) scope.launch { fetchAlbum(albumId) }
            return tracks
        }
        if (network.online) {
            withTimeoutOrNull(ALBUM_FETCH_TIMEOUT_MS.milliseconds) { fetchAlbum(albumId) }?.let { return it }
        }
        // Without the server, downloaded tracks still play.
        return downloads.albumTracks(albumId)
    }

    private suspend fun fetchAlbum(albumId: Long): List<PlaybackTrack>? {
        val album = api.fetchAlbum(albumId).valueOrNull() ?: return null
        // Outside the play request, so a newer request or timeout can't interrupt the download records mid-write.
        scope.launch { downloads.syncAlbum(album) }
        return album.tracks
    }

    private suspend fun albumsTracks(albumIds: List<Long>): List<PlaybackTrack> {
        val complete = albumIds.associateWith { downloads.completeAlbumTracks(it) }
        if (complete.values.all { it != null }) return complete.values.flatMap { it.orEmpty() }
        if (network.online) {
            val albums = withTimeoutOrNull(ALBUM_FETCH_TIMEOUT_MS.milliseconds) { api.fetchAlbums(albumIds) }?.valueOrNull()
            if (albums != null) return albums.flatMap { it.tracks }
        }
        return albumIds.flatMap { complete[it] ?: downloads.albumTracks(it) }
    }

    private fun canPlay(track: PlaybackTrack) =
        downloads.playableFile(track.trackId) != null || (network.online && streamFile(track) != null)

    private fun streamFile(track: PlaybackTrack): AudioFile? {
        val preferred = preferredStreamFile(track)
        return if (preferred.playable) preferred else track.opus96?.takeIf { it.playable }
    }

    private fun preferredStreamFile(track: PlaybackTrack) =
        if (settings.resolvedStreamQuality == AudioQuality.Original) {
            track.original
        } else {
            track.opus96
                ?: track.original
        }

    // A downloaded file, otherwise the file to stream at the chosen quality.
    private fun resolveSource(track: PlaybackTrack): PlaybackSource {
        val download = downloads.tracks[track.trackId]
        if (download != null && download.playable && download.file.exists()) {
            return PlaybackSource(download.audioFile ?: track.original, local = true)
        }
        if (!network.online) {
            throw UnplayableException(
                if (download?.status == DownloadStatus.Downloaded) {
                    "The downloaded ${track.original.formatName} original can't play on this device. " +
                        "Connect to stream it instead."
                } else {
                    "${track.title} isn't downloaded."
                },
            )
        }
        val file =
            streamFile(track)
                ?: throw UnplayableException("The original ${track.original.formatName} file can't play on this device.")
        return PlaybackSource(file, local = false)
    }

    // A fallback notice repeats for every track of e.g. a DSF album, so it shows once per album.
    private fun showNotice(
        entry: QueueEntry,
        source: PlaybackSource,
    ) {
        val preferred = preferredStreamFile(entry.track)
        val key =
            if (!source.local && source.file.id != preferred.id) "${entry.track.albumId}" else null
        if (key != null && key != lastNotice) {
            notices.show("The original ${preferred.formatName} file can't play on this device, so Opus 96 is playing.")
        }
        lastNotice = key
    }

    private fun QueueEntry.toMediaItem(source: PlaybackSource): MediaItem {
        val uri =
            downloads.playableFile(track.trackId)?.takeIf { source.local }?.let(Uri::fromFile)
                ?: Uri
                    .Builder()
                    .scheme(FILE_SCHEME)
                    .authority("audio")
                    .appendPath(source.file.id)
                    .build()
        return MediaItem
            .Builder()
            .setMediaId(entryId)
            .setUri(uri)
            .setMediaMetadata(
                MediaMetadata
                    .Builder()
                    .setTitle(track.title)
                    .setArtist(track.artistNames)
                    .setAlbumTitle(track.albumTitle)
                    .setArtworkUri(track.coverUrl?.toUri())
                    .setDurationMs(track.durationMs)
                    .setIsPlayable(true)
                    .setIsBrowsable(false)
                    .build(),
            ).build()
    }

    private fun sync() {
        val state = exo.playbackState
        status =
            when {
                exo.mediaItemCount == 0 || state == Player.STATE_IDLE && error == null && !exo.playWhenReady ->
                    PlayerStatus.Idle

                exo.playWhenReady && error == null && (state == Player.STATE_BUFFERING || state == Player.STATE_READY) ->
                    PlayerStatus.Playing

                else -> PlayerStatus.Paused
            }
        buffering = exo.playWhenReady && exo.playbackState == Player.STATE_BUFFERING
        hasNext = exo.hasNextMediaItem() || settings.radio && queue.isNotEmpty()
        durationMs = exo.duration.takeIf { it != C.TIME_UNSET && exo.mediaItemCount > 0 }
            ?: current?.track?.durationMs ?: 0
    }

    // A play counts once half the track was heard, capped at four minutes, like the web player.
    private fun trackListening(positionMs: Long) {
        val session = listening ?: return
        if (session.recorded) return
        val step = session.lastPositionMs?.let { positionMs - it } ?: 0
        session.lastPositionMs = positionMs
        if (step !in 1..MAX_PROGRESS_STEP_MS) return
        session.listenedMs += step
        if (session.listenedMs < min(session.track.durationMs / 2, MAX_LISTEN_THRESHOLD_MS)) return
        session.recorded = true
        scope.launch {
            try {
                api.recordListen(session.track.albumId, session.track.trackId)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
            }
        }
    }

    private class ListeningSession(
        val track: PlaybackTrack,
    ) {
        var listenedMs = 0L
        var lastPositionMs: Long? = null
        var recorded = false
    }

    private companion object {
        const val POSITION_ENTRY_KEY = "entryId"
        const val POSITION_MS_KEY = "positionMs"
    }
}

private fun RepeatMode.toExo() =
    when (this) {
        RepeatMode.Off -> Player.REPEAT_MODE_OFF
        RepeatMode.All -> Player.REPEAT_MODE_ALL
        RepeatMode.One -> Player.REPEAT_MODE_ONE
    }
