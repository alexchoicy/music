package com.alexchoicy.music.ui.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import com.alexchoicy.music.ui.theme.MusicTheme

@Composable
fun ConfirmDialog(
    title: String,
    message: String,
    confirmLabel: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    cancelLabel: String = "Cancel",
) {
    val colors = MusicTheme.colors
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                onClick = {
                    onDismiss()
                    onConfirm()
                },
            ) { Text(confirmLabel, style = MaterialTheme.typography.labelLarge, color = colors.primary) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(cancelLabel, style = MaterialTheme.typography.labelLarge, color = colors.foreground)
            }
        },
        title = { Text(title, style = MaterialTheme.typography.titleLarge) },
        text = { Text(message, style = MaterialTheme.typography.bodyMedium) },
        shape = MaterialTheme.shapes.large,
        containerColor = colors.popover,
        titleContentColor = colors.foreground,
        textContentColor = colors.mutedForeground,
    )
}
