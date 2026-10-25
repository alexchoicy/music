package com.alexchoicy.music.ui.playlists

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.R
import com.alexchoicy.music.api.PlaylistDetail
import com.alexchoicy.music.api.PlaylistEdit
import com.alexchoicy.music.api.PlaylistSummary
import com.alexchoicy.music.data.playlists.PLAYLIST_CONFLICT
import com.alexchoicy.music.data.playlists.PlaylistTrack
import com.alexchoicy.music.ui.components.ButtonVariant
import com.alexchoicy.music.ui.components.ConfirmDialog
import com.alexchoicy.music.ui.components.MusicBottomSheet
import com.alexchoicy.music.ui.components.MusicButton
import com.alexchoicy.music.ui.components.MusicTextField
import com.alexchoicy.music.ui.components.PlaylistCover
import com.alexchoicy.music.ui.components.SheetAction
import com.alexchoicy.music.ui.currentMusicApplication
import com.alexchoicy.music.ui.plural
import com.alexchoicy.music.ui.theme.MusicTheme
import kotlinx.coroutines.launch

class PlaylistTarget(
    val id: Long,
    val name: String,
    // Null for a downloaded copy, which can't be edited.
    val version: Long?,
)

fun PlaylistSummary.toTarget() = PlaylistTarget(id, name, version)

fun PlaylistDetail.toTarget() = PlaylistTarget(id, name, version)

// Names a new playlist, optionally adding addTrack to it, or renames an existing one.
@Composable
fun PlaylistNameSheet(
    onDismiss: () -> Unit,
    rename: PlaylistTarget? = null,
    addTrack: PlaylistTrack? = null,
) {
    val repository = currentMusicApplication().playlists
    val scope = rememberCoroutineScope()
    val focus = remember { FocusRequester() }
    var name by remember {
        val initial = rename?.name.orEmpty()
        mutableStateOf(TextFieldValue(initial, TextRange(0, initial.length)))
    }
    var pending by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val trimmed = name.text.trim()
    val canSubmit = trimmed.isNotEmpty() && trimmed != rename?.name

    fun submit(hide: () -> Unit) {
        if (!canSubmit || pending) return
        pending = true
        error = null
        scope.launch {
            if (rename == null) {
                if (repository.create(trimmed, addTrack) != null) {
                    hide()
                } else {
                    error = "Couldn't create the playlist."
                }
            } else {
                val result =
                    rename.version?.let { repository.rename(rename.id, it, trimmed) } ?: PlaylistEdit.Failed
                when (result) {
                    PlaylistEdit.Done -> hide()
                    PlaylistEdit.Conflict -> error = PLAYLIST_CONFLICT
                    PlaylistEdit.Failed -> error = "Couldn't rename the playlist."
                }
            }
            pending = false
        }
    }

    MusicBottomSheet(
        title = if (rename != null) "Rename playlist" else "New playlist",
        onDismiss = onDismiss,
        footer = { hide ->
            MusicButton(
                text = "Cancel",
                onClick = hide,
                modifier = Modifier.weight(1f),
                variant = ButtonVariant.Secondary,
                enabled = !pending,
            )
            MusicButton(
                text = if (rename != null) "Rename" else "Create",
                onClick = { submit(hide) },
                modifier = Modifier.weight(1f),
                enabled = canSubmit,
                loading = pending,
            )
        },
    ) { hide ->
        // The sheet composes its content in its own window, so focus once that is attached.
        LaunchedEffect(Unit) { focus.requestFocus() }
        Box(Modifier.padding(horizontal = 24.dp)) {
            MusicTextField(
                value = name,
                onValueChange = { name = it },
                label = "Name",
                modifier = Modifier.focusRequester(focus),
                error = error,
                placeholder = "My playlist",
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { submit(hide) }),
            )
        }
    }
}

private enum class PlaylistMenuStep { Actions, Rename, Delete }

// Rename and Delete for a playlist, from its page or a long press on its tile; onPlay adds Play and Shuffle.
@Composable
fun PlaylistMenu(
    target: PlaylistTarget,
    onDismiss: () -> Unit,
    onDeleted: () -> Unit = {},
    onPlay: ((shuffle: Boolean) -> Unit)? = null,
) {
    val app = currentMusicApplication()
    val editable = app.network.online && target.version != null
    var step by remember { mutableStateOf(PlaylistMenuStep.Actions) }
    var next by remember { mutableStateOf<PlaylistMenuStep?>(null) }

    when (step) {
        PlaylistMenuStep.Actions ->
            MusicBottomSheet(
                title = target.name,
                subtitle = if (editable) null else "Connect to change playlists.",
                onDismiss = { next?.let { step = it } ?: onDismiss() },
            ) { hide ->
                Column {
                    if (onPlay != null) {
                        SheetAction(R.drawable.ic_play, "Play") {
                            onPlay(false)
                            hide()
                        }
                        SheetAction(R.drawable.ic_shuffle, "Shuffle") {
                            onPlay(true)
                            hide()
                        }
                    }
                    SheetAction(R.drawable.ic_pencil, "Rename", enabled = editable) {
                        next = PlaylistMenuStep.Rename
                        hide()
                    }
                    SheetAction(R.drawable.ic_trash, "Delete playlist", enabled = editable, destructive = true) {
                        next = PlaylistMenuStep.Delete
                        hide()
                    }
                }
            }

        PlaylistMenuStep.Rename -> PlaylistNameSheet(onDismiss = onDismiss, rename = target)

        PlaylistMenuStep.Delete ->
            ConfirmDialog(
                title = "Delete ${target.name}?",
                message = "This can't be undone.",
                confirmLabel = "Delete",
                onConfirm = {
                    target.version?.let { app.playlists.delete(target.id, it, target.name, onDeleted) }
                },
                onDismiss = onDismiss,
            )
    }
}

// Picks a playlist, or names a new one, to add a track to.
@Composable
fun AddToPlaylistSheet(
    albumDiscId: Long,
    trackId: Long,
    onDismiss: () -> Unit,
) {
    val repository = currentMusicApplication().playlists
    var creating by remember { mutableStateOf(false) }
    var openCreate by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(true) }
    var failed by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        failed = !repository.syncList()
        loading = false
    }

    if (creating) {
        PlaylistNameSheet(onDismiss = onDismiss, addTrack = PlaylistTrack(albumDiscId, trackId))
        return
    }

    MusicBottomSheet(
        title = "Add to playlist",
        onDismiss = { if (openCreate) creating = true else onDismiss() },
    ) { hide ->
        Column {
            SheetAction(R.drawable.ic_plus, "New playlist…") {
                openCreate = true
                hide()
            }
            val playlists = repository.playlists
            when {
                playlists != null ->
                    playlists.forEach { playlist ->
                        PlaylistOption(playlist) {
                            playlist.version?.let {
                                repository.addTrack(playlist.id, it, playlist.name, PlaylistTrack(albumDiscId, trackId))
                            }
                            hide()
                        }
                    }

                loading -> SheetMessage("Loading…")
                failed -> SheetMessage("Couldn't load playlists.")
            }
        }
    }
}

@Composable
private fun PlaylistOption(
    playlist: PlaylistSummary,
    onClick: () -> Unit,
) {
    val colors = MusicTheme.colors
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp)
                .clip(MaterialTheme.shapes.medium)
                .clickable(onClick = onClick)
                .heightIn(min = 64.dp)
                .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        PlaylistCover(
            urls = playlist.coverUrls,
            shape = MaterialTheme.shapes.small,
            modifier = Modifier.size(48.dp),
            placeholderIconSize = 20.dp,
        )
        Column(Modifier.weight(1f)) {
            Text(
                text = playlist.name,
                style = MaterialTheme.typography.titleSmall,
                color = colors.foreground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = plural(playlist.trackCount, "track"),
                style = MaterialTheme.typography.bodySmall,
                color = colors.mutedForeground,
            )
        }
    }
}

@Composable
private fun SheetMessage(text: String) {
    Text(
        text = text,
        modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp),
        style = MaterialTheme.typography.bodyMedium,
        color = MusicTheme.colors.mutedForeground,
    )
}
