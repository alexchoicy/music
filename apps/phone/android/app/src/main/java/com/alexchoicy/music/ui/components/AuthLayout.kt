package com.alexchoicy.music.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.alexchoicy.music.R
import com.alexchoicy.music.ui.theme.MusicTheme

@Composable
fun AuthLayout(title: String, description: String, content: @Composable ColumnScope.() -> Unit) {
    val colors = MusicTheme.colors

    BoxWithConstraints(modifier = Modifier.fillMaxSize().safeDrawingPadding()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .heightIn(min = maxHeight)
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(
                modifier = Modifier.widthIn(max = 384.dp).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(32.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Icon(
                        painter = painterResource(R.drawable.app_mark),
                        contentDescription = null,
                        modifier = Modifier.size(width = 46.dp, height = 48.dp),
                        tint = colors.foreground,
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            title,
                            modifier = Modifier.semantics { heading() },
                            color = colors.foreground,
                            style = MaterialTheme.typography.headlineLarge,
                        )
                        Text(
                            description,
                            color = colors.mutedForeground,
                            style = MaterialTheme.typography.bodyLarge,
                        )
                    }
                }
                content()
            }
        }
    }
}
