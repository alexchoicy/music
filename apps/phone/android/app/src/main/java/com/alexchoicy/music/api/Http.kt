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
import io.ktor.client.request.request
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.json.Json

private const val TIMEOUT_MS = 10_000L

internal val ApiJson = Json { ignoreUnknownKeys = true }

internal fun serverHttpUrl(serverUrl: String) = if ("://" in serverUrl) serverUrl else "https://$serverUrl"

internal fun serverWebSocketUrl(serverUrl: String) = serverHttpUrl(serverUrl).replaceFirst("http", "ws")

fun createHttpClient() =
    HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(ApiJson)
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
    data class Loaded<T>(
        val value: T,
    ) : ApiOutcome<T>

    data object Unauthorized : ApiOutcome<Nothing>

    data object Failed : ApiOutcome<Nothing>
}

fun <T> ApiOutcome<T>.valueOrNull(): T? = (this as? ApiOutcome.Loaded)?.value

internal class UnauthorizedException : Exception()

internal class HttpStatusException(
    path: String,
    val status: Int,
) : Exception("$path returned $status")

internal suspend fun <T> apiOutcome(block: suspend () -> T): ApiOutcome<T> =
    try {
        ApiOutcome.Loaded(block())
    } catch (e: CancellationException) {
        throw e
    } catch (_: UnauthorizedException) {
        ApiOutcome.Unauthorized
    } catch (_: Exception) {
        ApiOutcome.Failed
    }

class ApiClient(
    private val http: HttpClient,
    private val session: SessionStore,
) {
    internal suspend inline fun <reified T> get(
        path: String,
        noinline block: HttpRequestBuilder.() -> Unit = {},
    ): T = send(path, block).body()

    internal suspend fun getText(path: String): String = send(path) { accept(ContentType.Text.Plain) }.bodyAsText()

    internal suspend inline fun <reified T> post(
        path: String,
        body: T,
    ) {
        postRequest(path, body)
    }

    internal suspend inline fun <reified T, reified R> postOrNull(
        path: String,
        body: T,
    ): R? {
        val response = postRequest(path, body)
        return if (response.status == HttpStatusCode.NoContent) null else response.body<R>()
    }

    internal suspend inline fun <reified T> put(
        path: String,
        body: T,
    ) {
        send(path) {
            method = HttpMethod.Put
            contentType(ContentType.Application.Json)
            setBody(body)
        }
    }

    internal suspend fun delete(
        path: String,
        block: HttpRequestBuilder.() -> Unit = {},
    ) {
        send(path) {
            method = HttpMethod.Delete
            block()
        }
    }

    @PublishedApi
    internal suspend inline fun <reified T> postRequest(
        path: String,
        body: T,
    ) = send(path) {
        method = HttpMethod.Post
        contentType(ContentType.Application.Json)
        setBody(body)
    }

    @PublishedApi
    internal suspend fun send(
        path: String,
        block: HttpRequestBuilder.() -> Unit,
    ): HttpResponse {
        val serverUrl = session.serverUrl ?: throw UnauthorizedException()
        val token = session.token ?: throw UnauthorizedException()
        val response =
            http.request("${serverHttpUrl(serverUrl)}$path") {
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

            !response.status.isSuccess() -> throw HttpStatusException(path, response.status.value)
        }
        return response
    }
}
