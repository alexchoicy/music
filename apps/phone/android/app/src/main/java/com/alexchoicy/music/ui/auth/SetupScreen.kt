package com.alexchoicy.music.ui.auth

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.lifecycle.viewmodel.compose.viewModel
import com.alexchoicy.music.ui.components.AuthLayout
import com.alexchoicy.music.ui.components.MusicButton
import com.alexchoicy.music.ui.components.MusicTextField
import com.alexchoicy.music.ui.musicApplication

@Composable
fun SetupScreen(
    viewModel: SetupViewModel =
        viewModel { SetupViewModel(musicApplication().session, musicApplication().authApi) },
) {
    var serverUrl by rememberSaveable(stateSaver = TextFieldValue.Saver) {
        mutableStateOf(
            TextFieldValue(),
        )
    }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    fun submit() = viewModel.connect(serverUrl.text)

    AuthLayout(
        title = "Connect to your library",
    ) {
        MusicTextField(
            value = serverUrl,
            onValueChange = {
                serverUrl = it
                viewModel.clearError()
            },
            label = "Server address",
            modifier =
                Modifier
                    .focusRequester(focusRequester),
            error = viewModel.error,
            placeholder = "music.example.com",
            keyboardOptions =
                KeyboardOptions(
                    capitalization = KeyboardCapitalization.None,
                    autoCorrectEnabled = false,
                    keyboardType = KeyboardType.Uri,
                    imeAction = ImeAction.Go,
                ),
            keyboardActions = KeyboardActions(onGo = { submit() }),
        )
        MusicButton(
            text = "Continue",
            onClick = ::submit,
            modifier = Modifier.fillMaxWidth(),
            loading = viewModel.checking,
        )
    }
}
