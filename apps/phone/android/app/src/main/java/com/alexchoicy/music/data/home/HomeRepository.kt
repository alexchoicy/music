package com.alexchoicy.music.data.home

import androidx.compose.runtime.snapshotFlow
import com.alexchoicy.music.api.HomeApi
import com.alexchoicy.music.api.HomeFeed
import com.alexchoicy.music.api.HomeOutcome
import com.alexchoicy.music.session.SessionStore
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf

data class HomeData(
    val feed: HomeFeed,
    val connected: Boolean,
)

enum class RefreshResult { Refreshed, Failed, SignedOut }

class HomeRepository(
    private val session: SessionStore,
    private val api: HomeApi,
    private val dao: HomeDao,
) {
    private data class Session(val serverUrl: String, val token: String)

    private val connectedSession = MutableStateFlow<Session?>(null)

    private val currentSession: Flow<Session?> = snapshotFlow {
        val serverUrl = session.serverUrl
        val token = session.token
        if (serverUrl != null && token != null) Session(serverUrl, token) else null
    }.distinctUntilChanged()

    val sessionChanges: Flow<Any?> = currentSession

    @OptIn(ExperimentalCoroutinesApi::class)
    val home: Flow<HomeData?> = currentSession.flatMapLatest { current ->
        if (current == null) {
            flowOf(null)
        } else {
            combine(
                dao.observe().distinctUntilChanged(),
                connectedSession,
            ) { feed, connected ->
                feed?.let { HomeData(it, connected = connected == current) }
            }
        }
    }

    suspend fun refresh(): RefreshResult {
        val serverUrl = session.serverUrl
        val token = session.token
        if (serverUrl == null || token == null) return RefreshResult.SignedOut
        val current = Session(serverUrl, token)
        return when (val outcome = api.fetchHome(serverUrl, token)) {
            is HomeOutcome.Loaded -> try {
                dao.replace(outcome.feed)
                connectedSession.value = current
                RefreshResult.Refreshed
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                RefreshResult.Failed
            }
            HomeOutcome.Unauthorized -> {
                connectedSession.value = null
                session.updateToken(null)
                RefreshResult.SignedOut
            }
            HomeOutcome.Failed -> {
                connectedSession.value = null
                RefreshResult.Failed
            }
        }
    }
}
