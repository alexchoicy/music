package com.alexchoicy.music.ui.player

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.animateScrollBy
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.interaction.DragInteraction
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.State
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.structuralEqualityPolicy
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.intl.LocaleList
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import com.alexchoicy.music.R
import com.alexchoicy.music.api.LyricVersion
import com.alexchoicy.music.api.Lyrics
import com.alexchoicy.music.data.lyrics.LyricsRepository
import com.alexchoicy.music.playback.MusicPlayer
import com.alexchoicy.music.playback.PlayerStatus
import com.alexchoicy.music.ui.components.ButtonVariant
import com.alexchoicy.music.ui.components.EmptyState
import com.alexchoicy.music.ui.components.MusicButton
import com.alexchoicy.music.ui.theme.MusicTheme

private val LyricLineStyle = TextStyle(fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.SemiBold)
private val DuetIndent = 40.dp

private val LocaleByLanguage =
    mapOf("cantonese" to "zh-HK", "english" to "en", "japanese" to "ja", "korean" to "ko", "mandarin" to "zh")

sealed interface LyricsContent {
    data object Loading : LyricsContent

    data object Failed : LyricsContent

    data object None : LyricsContent

    data class Synced(
        val cues: List<LyricCue>,
    ) : LyricsContent

    data class Plain(
        val text: String,
    ) : LyricsContent
}

private data class LyricChoice(
    val subtitleId: Long,
    val languageId: Long?,
    val title: String?,
)

@Stable
class PlayerLyrics {
    var versions by mutableStateOf<List<LyricVersion>?>(null)
        private set
    private var trackId: Long? = null
    private var versionsRead by mutableStateOf(false)
    private var versionsFailed by mutableStateOf(false)
    private var choice by mutableStateOf<LyricChoice?>(null)
    private var shownId by mutableStateOf<Long?>(null)
    private var shown by mutableStateOf<LyricsContent?>(null)
    private var shownRead by mutableStateOf(false)
    private var shownFailed by mutableStateOf(false)
    internal var attempt by mutableIntStateOf(0)
        private set

    val selected: LyricVersion?
        get() {
            val versions = versions ?: return null
            val choice = choice ?: return versions.firstOrNull()
            return versions.firstOrNull { it.subtitleId == choice.subtitleId }
                ?: versions.firstOrNull { it.languageId == choice.languageId && it.title == choice.title }
                ?: versions.firstOrNull { it.languageId == choice.languageId }
                ?: versions.firstOrNull()
        }

    val content: LyricsContent
        get() {
            val selected = selected
            return when {
                versions == null -> if (versionsRead && versionsFailed) LyricsContent.Failed else LyricsContent.Loading
                selected == null -> LyricsContent.None
                shownId != selected.subtitleId -> LyricsContent.Loading
                else -> shown ?: if (shownRead && shownFailed) LyricsContent.Failed else LyricsContent.Loading
            }
        }

    val locale: LocaleList?
        get() =
            selected
                ?.languageName
                ?.lowercase()
                ?.let(LocaleByLanguage::get)
                ?.let(::LocaleList)

    fun select(version: LyricVersion) {
        choice = LyricChoice(version.subtitleId, version.languageId, version.title)
    }

    fun retry() {
        versionsFailed = false
        shownFailed = false
        attempt++
    }

    internal fun startTrack(trackId: Long) {
        if (this.trackId == trackId) return
        this.trackId = trackId
        versions = null
        versionsRead = false
        versionsFailed = false
    }

    internal fun savedVersions(versions: List<LyricVersion>?) {
        this.versions = versions
        versionsRead = true
    }

    internal fun syncedVersions(synced: Boolean) {
        versionsFailed = !synced
    }

    internal fun startLyrics(subtitleId: Long) {
        if (shownId == subtitleId) return
        shownId = subtitleId
        shown = null
        shownRead = false
        shownFailed = false
    }

    internal fun savedLyrics(lyrics: Lyrics?) {
        shown = lyrics?.toContent()
        shownRead = true
    }

    internal fun syncedLyrics(synced: Boolean) {
        shownFailed = !synced
    }
}

private fun Lyrics.toContent(): LyricsContent {
    val cues = parsed?.toCues().orEmpty()
    val text = plainText?.trim().orEmpty()
    return when {
        cues.isNotEmpty() -> LyricsContent.Synced(cues)
        text.isNotEmpty() -> LyricsContent.Plain(text)
        else -> LyricsContent.None
    }
}

@Composable
fun rememberPlayerLyrics(
    repository: LyricsRepository,
    albumId: Long,
    trackId: Long,
    online: Boolean,
    needsVersions: Boolean,
    needsLyrics: Boolean,
): PlayerLyrics {
    val lyrics = remember(repository) { PlayerLyrics() }
    val needed = needsVersions || needsLyrics
    val attempt = lyrics.attempt
    lyrics.startTrack(trackId)
    LaunchedEffect(lyrics, trackId, needed) {
        if (needed) repository.versions(trackId).collect(lyrics::savedVersions)
    }
    LaunchedEffect(lyrics, albumId, trackId, needed, online, attempt) {
        if (needed) lyrics.syncedVersions(repository.syncVersions(albumId, trackId))
    }
    val subtitleId = lyrics.selected?.subtitleId
    LaunchedEffect(lyrics, subtitleId, needsLyrics) {
        if (!needsLyrics || subtitleId == null) return@LaunchedEffect
        lyrics.startLyrics(subtitleId)
        repository.lyrics(subtitleId).collect(lyrics::savedLyrics)
    }
    LaunchedEffect(lyrics, subtitleId, needsLyrics, online, attempt) {
        if (needsLyrics && subtitleId != null) lyrics.syncedLyrics(repository.syncLyrics(subtitleId))
    }
    return lyrics
}

@Composable
fun rememberFramePosition(
    player: MusicPlayer,
    running: Boolean,
): State<Long> {
    val position = remember { mutableLongStateOf(player.positionMs) }
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(lifecycle, running, player.status, player.current?.entryId, player.positionJumps) {
        position.longValue = player.positionMs
        if (!running) return@LaunchedEffect
        lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            while (player.status == PlayerStatus.Playing) {
                withFrameMillis { position.longValue = player.positionMs }
            }
        }
    }
    return position
}

private fun voiceAlignment(voice: LyricVoice?) =
    when (voice) {
        LyricVoice.Other -> Alignment.End
        LyricVoice.Group -> Alignment.CenterHorizontally
        else -> Alignment.Start
    }

private fun voiceTextAlign(voice: LyricVoice?) =
    when (voice) {
        LyricVoice.Other -> TextAlign.End
        LyricVoice.Group -> TextAlign.Center
        else -> TextAlign.Start
    }

private fun sungText(
    cue: LyricCue,
    sung: Int,
    sungColor: Color,
    unsungColor: Color,
): AnnotatedString =
    buildAnnotatedString {
        cue.words.forEachIndexed { index, word ->
            withStyle(SpanStyle(color = if (index <= sung) sungColor else unsungColor)) { append(word.text) }
        }
    }

@Composable
private fun LiveText(
    cue: LyricCue,
    position: () -> Long,
    style: TextStyle,
    textAlign: TextAlign,
    unsungColor: Color,
    modifier: Modifier = Modifier,
) {
    val colors = MusicTheme.colors
    if (cue.words.isEmpty()) {
        Text(cue.text, modifier = modifier, style = style, color = colors.primary, textAlign = textAlign)
        return
    }
    val sung by remember(cue) {
        derivedStateOf(structuralEqualityPolicy()) { cue.words.startedAt(position()) { it.startMs } }
    }
    Text(sungText(cue, sung, colors.primary, unsungColor), modifier = modifier, style = style, textAlign = textAlign)
}

@Composable
fun BoxScope.LyricsCaption(
    lyrics: PlayerLyrics,
    position: () -> Long,
) {
    val colors = MusicTheme.colors
    val content = lyrics.content
    val cues = (content as? LyricsContent.Synced)?.cues.orEmpty()
    val live by remember(cues) { derivedStateOf(structuralEqualityPolicy()) { cues.liveAt(position()) } }
    val notice =
        when (content) {
            LyricsContent.Failed -> "Couldn't load lyrics"
            LyricsContent.None -> "No lyrics for this track"
            else -> null
        }
    if (live.isEmpty() && notice == null) return
    val locale = lyrics.locale
    Column(
        modifier =
            Modifier
                .align(Alignment.BottomCenter)
                .padding(12.dp)
                .fillMaxWidth()
                .background(colors.popover.copy(alpha = 0.85f), MaterialTheme.shapes.extraLarge)
                .padding(horizontal = 20.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        if (live.isEmpty()) {
            Text(
                text = notice.orEmpty(),
                modifier = Modifier.fillMaxWidth(),
                style = MaterialTheme.typography.bodyMedium,
                color = colors.mutedForeground,
                textAlign = TextAlign.Center,
            )
        }
        live.forEach { index ->
            val cue = cues[index]
            val textAlign = if (live.size > 1) voiceTextAlign(cue.voice) else TextAlign.Center
            Column(Modifier.fillMaxWidth()) {
                if (cue.singer != null) {
                    Text(
                        text = cue.singer,
                        modifier = Modifier.fillMaxWidth(),
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.mutedForeground,
                        textAlign = textAlign,
                    )
                }
                LiveText(
                    cue = cue,
                    position = position,
                    style = MaterialTheme.typography.labelLarge.copy(localeList = locale),
                    textAlign = textAlign,
                    unsungColor = colors.foreground,
                    modifier = Modifier.fillMaxWidth(),
                )
                cue.translations.forEach {
                    Text(
                        text = it,
                        modifier = Modifier.fillMaxWidth(),
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.mutedForeground,
                        textAlign = textAlign,
                    )
                }
            }
        }
    }
}

@Composable
fun LyricsView(
    lyrics: PlayerLyrics,
    position: () -> Long,
    onSeek: (Long) -> Unit,
    modifier: Modifier,
) {
    Box(modifier) {
        when (val content = lyrics.content) {
            LyricsContent.Loading ->
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center).size(24.dp),
                    color = MusicTheme.colors.mutedForeground,
                    strokeWidth = 2.dp,
                )

            LyricsContent.None ->
                EmptyState(
                    icon = R.drawable.ic_lyrics,
                    title = "No lyrics for this track",
                    modifier = Modifier.align(Alignment.Center),
                )

            LyricsContent.Failed ->
                EmptyState(
                    icon = R.drawable.ic_alert,
                    title = "Couldn't load lyrics",
                    modifier = Modifier.align(Alignment.Center),
                ) {
                    MusicButton(text = "Try again", onClick = lyrics::retry, variant = ButtonVariant.Secondary)
                }

            is LyricsContent.Plain ->
                Text(
                    text = content.text,
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(vertical = 16.dp),
                    style = LyricLineStyle.copy(localeList = lyrics.locale),
                    color = MusicTheme.colors.foreground,
                )

            is LyricsContent.Synced -> SyncedLyrics(content.cues, lyrics.locale, position, onSeek)
        }
    }
}

private suspend fun LazyListState.centre(
    index: Int,
    animate: Boolean,
) {
    if (layoutInfo.visibleItemsInfo.none { it.index == index }) {
        scrollToItem(index)
        withFrameMillis {}
    }
    val item = layoutInfo.visibleItemsInfo.firstOrNull { it.index == index } ?: return
    val centre = (layoutInfo.viewportStartOffset + layoutInfo.viewportEndOffset) / 2
    val delta = (item.offset + item.size / 2 - centre).toFloat()
    if (animate) animateScrollBy(delta) else scrollBy(delta)
}

@Composable
private fun BoxScope.SyncedLyrics(
    cues: List<LyricCue>,
    locale: LocaleList?,
    position: () -> Long,
    onSeek: (Long) -> Unit,
) {
    val colors = MusicTheme.colors
    val listState = remember(cues) { LazyListState() }
    var following by remember(cues) { mutableStateOf(true) }
    var centred by remember(cues) { mutableStateOf(false) }
    val active by remember(cues) {
        derivedStateOf(structuralEqualityPolicy()) { cues.startedAt(position()) { it.startMs } }
    }
    val live by remember(cues) { derivedStateOf(structuralEqualityPolicy()) { cues.liveAt(position()) } }
    val isDuet = remember(cues) { cues.any { it.voice == LyricVoice.Other } }
    val lineStyle = LyricLineStyle.copy(localeList = locale)

    LaunchedEffect(listState) {
        listState.interactionSource.interactions.collect {
            if (it is DragInteraction.Start) following = false
        }
    }
    LaunchedEffect(listState, active, following) {
        if (!following) return@LaunchedEffect
        listState.centre(active.coerceAtLeast(0), animate = centred)
        centred = true
    }

    BoxWithConstraints(Modifier.fillMaxSize()) {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(vertical = maxHeight / 2),
        ) {
            itemsIndexed(cues) { index, cue ->
                val isLive = index in live
                val alignment = voiceAlignment(cue.voice)
                val textAlign = voiceTextAlign(cue.voice)
                val indent =
                    when {
                        !isDuet -> Modifier
                        cue.voice == LyricVoice.Main -> Modifier.padding(end = DuetIndent)
                        cue.voice == LyricVoice.Other -> Modifier.padding(start = DuetIndent)
                        else -> Modifier
                    }
                Column(
                    modifier = Modifier.fillMaxWidth().then(indent),
                    horizontalAlignment = alignment,
                ) {
                    if (cue.singer != null && (index == 0 || cue.singer != cues[index - 1].singer)) {
                        Text(
                            text = cue.singer,
                            modifier = Modifier.padding(top = 16.dp, bottom = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.mutedForeground,
                            textAlign = textAlign,
                        )
                    }
                    Column(
                        modifier =
                            Modifier
                                .clip(MaterialTheme.shapes.medium)
                                .clickable {
                                    following = true
                                    onSeek(cue.startMs)
                                }.padding(vertical = 8.dp),
                        horizontalAlignment = alignment,
                    ) {
                        if (isLive) {
                            LiveText(cue, position, lineStyle, textAlign, colors.foreground)
                        } else {
                            Text(cue.text, style = lineStyle, color = colors.mutedForeground, textAlign = textAlign)
                        }
                        listOfNotNull(cue.background).plus(cue.romanizations).plus(cue.translations).forEach {
                            Text(
                                text = it,
                                style = MaterialTheme.typography.bodyLarge,
                                color = colors.mutedForeground,
                                textAlign = textAlign,
                            )
                        }
                    }
                }
            }
        }
    }
    if (!following) {
        MusicButton(
            text = "Sync",
            onClick = { following = true },
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 12.dp),
            variant = ButtonVariant.Secondary,
            icon = R.drawable.ic_locate_fixed,
        )
    }
}
