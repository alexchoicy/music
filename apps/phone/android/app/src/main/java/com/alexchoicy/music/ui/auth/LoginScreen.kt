package com.alexchoicy.music.ui.auth

import android.provider.Settings
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.semantics.contentType
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.alexchoicy.music.ui.components.AuthLayout
import com.alexchoicy.music.ui.components.ButtonVariant
import com.alexchoicy.music.ui.components.MusicButton
import com.alexchoicy.music.ui.components.MusicTextField
import com.alexchoicy.music.ui.musicApplication
import com.alexchoicy.music.ui.theme.MusicTheme

@Composable
fun LoginScreen(
    serverUrl: String,
    viewModel: LoginViewModel = viewModel {
        val application = musicApplication()
        LoginViewModel(
            session = application.session,
            api = application.authApi,
            database = application.database,
            deviceName = Settings.Global.getString(
                application.contentResolver,
                Settings.Global.DEVICE_NAME,
            ),
        )
    },
) {
    val colors = MusicTheme.colors
    var username by rememberSaveable(stateSaver = TextFieldValue.Saver) {
        mutableStateOf(
            TextFieldValue(),
        )
    }
    var password by rememberSaveable(stateSaver = TextFieldValue.Saver) {
        mutableStateOf(
            TextFieldValue(),
        )
    }
    var usernameError by rememberSaveable { mutableStateOf<String?>(null) }
    var passwordError by rememberSaveable { mutableStateOf<String?>(null) }
    val usernameFocus = remember { FocusRequester() }
    val passwordFocus = remember { FocusRequester() }

    fun submit() {
        usernameError = if (username.text.isEmpty()) "Enter your username" else null
        passwordError = if (password.text.isEmpty()) "Enter your password" else null
        when {
            usernameError != null -> usernameFocus.requestFocus()
            passwordError != null -> passwordFocus.requestFocus()
            else -> viewModel.signIn(username.text, password.text)
        }
    }

    AuthLayout(
        title = "Welcome back",
        description = "Sign in to listen to your music library.",
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            MusicTextField(
                value = username,
                onValueChange = {
                    username = it
                    usernameError = null
                    viewModel.clearError()
                },
                label = "Username",
                error = usernameError,
                modifier = Modifier
                    .focusRequester(usernameFocus)
                    .semantics { contentType = ContentType.Username },
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.None,
                    autoCorrectEnabled = false,
                    imeAction = ImeAction.Next,
                ),
                keyboardActions = KeyboardActions(onNext = { passwordFocus.requestFocus() }),
            )
            MusicTextField(
                value = password,
                onValueChange = {
                    password = it
                    passwordError = null
                    viewModel.clearError()
                },
                label = "Password",
                modifier = Modifier
                    .focusRequester(passwordFocus)
                    .semantics { contentType = ContentType.Password },
                error = passwordError ?: viewModel.error,
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.None,
                    autoCorrectEnabled = false,
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Go,
                ),
                keyboardActions = KeyboardActions(onGo = { submit() }),
                visualTransformation = PasswordVisualTransformation(),
            )
        }

        MusicButton(
            text = "Sign in",
            onClick = ::submit,
            modifier = Modifier.fillMaxWidth(),
            loading = viewModel.signingIn,
        )

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                "Server",
                color = colors.mutedForeground,
                style = MaterialTheme.typography.bodySmall,
            )
            Text(
                serverUrl,
                color = colors.foreground,
                style = MaterialTheme.typography.labelMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            MusicButton(
                text = "Change server",
                onClick = viewModel::changeServer,
                modifier = Modifier.padding(top = 4.dp),
                variant = ButtonVariant.Ghost,
                enabled = !viewModel.signingIn,
            )
        }
    }
}
