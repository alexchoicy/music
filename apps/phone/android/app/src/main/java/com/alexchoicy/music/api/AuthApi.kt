package com.alexchoicy.music.api

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.Serializable

sealed interface LoginOutcome {
    data class SignedIn(
        val token: String,
    ) : LoginOutcome

    data object InvalidCredentials : LoginOutcome

    data object ServerError : LoginOutcome

    data object Unreachable : LoginOutcome
}

@Serializable
private class LoginRequest(
    val username: String,
    val password: String,
    val client: String,
    val deviceName: String?,
)

@Serializable
private class LoginResult(
    val token: String? = null,
)

class AuthApi(
    private val client: HttpClient,
) {
    suspend fun checkServer(serverUrl: String): Boolean =
        try {
            client.get("https://$serverUrl/auth").status.value in setOf(200, 401)
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            false
        }

    suspend fun login(
        serverUrl: String,
        username: String,
        password: String,
        deviceName: String?,
    ): LoginOutcome =
        try {
            val response =
                client.post("https://$serverUrl/auth/login") {
                    contentType(ContentType.Application.Json)
                    setBody(LoginRequest(username, password, client = "App", deviceName))
                }
            when {
                response.status.value == 401 -> LoginOutcome.InvalidCredentials
                !response.status.isSuccess() -> LoginOutcome.ServerError
                else ->
                    response
                        .body<LoginResult>()
                        .token
                        ?.let { LoginOutcome.SignedIn(it) }
                        ?: LoginOutcome.ServerError
            }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            LoginOutcome.Unreachable
        }
}
