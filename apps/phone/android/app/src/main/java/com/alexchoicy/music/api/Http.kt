package com.alexchoicy.music.api

import com.alexchoicy.music.session.SessionStore
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.accept
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.json.Json

private const val TIMEOUT_MS = 10_000L

fun createHttpClient() = HttpClient(OkHttp) {
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true })
    }
    install(HttpTimeout) {
        connectTimeoutMillis = TIMEOUT_MS
        socketTimeoutMillis = TIMEOUT_MS
    }
    defaultRequest {
        accept(ContentType.Application.Json)
    }
}

sealed interface ApiOutcome<out T> {
    data class Loaded<T>(val value: T) : ApiOutcome<T>
    data object Unauthorized : ApiOutcome<Nothing>
    data object Failed : ApiOutcome<Nothing>
}

internal class UnauthorizedException : Exception()

internal suspend fun <T> apiOutcome(block: suspend () -> T): ApiOutcome<T> = try {
    ApiOutcome.Loaded(block())
} catch (e: CancellationException) {
    throw e
} catch (_: UnauthorizedException) {
    ApiOutcome.Unauthorized
} catch (_: Exception) {
    ApiOutcome.Failed
}

class ApiClient(private val http: HttpClient, private val session: SessionStore) {
    internal suspend inline fun <reified T> get(
        path: String,
        noinline block: HttpRequestBuilder.() -> Unit = {},
    ): T = send(path, block).body()

    @PublishedApi
    internal suspend fun send(path: String, block: HttpRequestBuilder.() -> Unit): HttpResponse {
        val serverUrl = session.serverUrl ?: throw UnauthorizedException()
        val token = session.token ?: throw UnauthorizedException()
        val response = http.get("https://$serverUrl$path") {
            bearerAuth(token)
            block()
        }
        when {
            response.status.value == 401 -> {
                if (session.serverUrl == serverUrl && session.token == token) {
                    session.updateToken(null)
                }
                throw UnauthorizedException()
            }

            !response.status.isSuccess() -> error("$path returned ${response.status.value}")
        }
        return response
    }
}
