package com.alexchoicy.music.data.home

import androidx.compose.runtime.snapshotFlow
import com.alexchoicy.music.api.ApiOutcome
import com.alexchoicy.music.api.ContinueListeningItem
import com.alexchoicy.music.api.HomeApi
import com.alexchoicy.music.api.HomeFeed
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
    val continueListening: List<ContinueListeningItem>,
)

enum class RefreshResult { Refreshed, Failed, SignedOut }

class HomeRepository(
    private val session: SessionStore,
    private val api: HomeApi,
    private val dao: HomeDao,
    private val deviceId: String,
) {
    private data class Session(
        val serverUrl: String,
        val token: String,
    )

    private data class ContinueListening(
        val session: Session,
        val items: List<ContinueListeningItem>,
    )

    private val continueListening = MutableStateFlow<ContinueListening?>(null)

    private val currentSession: Flow<Session?> =
        snapshotFlow {
            val serverUrl = session.serverUrl
            val token = session.token
            if (serverUrl != null && token != null) Session(serverUrl, token) else null
        }.distinctUntilChanged()

    val sessionChanges: Flow<Any?> = currentSession

    @OptIn(ExperimentalCoroutinesApi::class)
    val home: Flow<HomeData?> =
        currentSession.flatMapLatest { current ->
            if (current == null) {
                flowOf(null)
            } else {
                combine(
                    dao.observe().distinctUntilChanged(),
                    continueListening,
                ) { feed, live ->
                    feed?.let {
                        HomeData(it, live?.takeIf { live.session == current }?.items.orEmpty())
                    }
                }
            }
        }

    suspend fun refresh(): RefreshResult {
        val serverUrl = session.serverUrl
        val token = session.token
        if (serverUrl == null || token == null) return RefreshResult.SignedOut
        val current = Session(serverUrl, token)
        return when (val outcome = api.fetchHome()) {
            is ApiOutcome.Loaded ->
                try {
                    dao.replace(outcome.value.feed)
                    continueListening.value =
                        ContinueListening(
                            current,
                            outcome.value.continueListening.filterNot { it.deviceId.equals(deviceId, ignoreCase = true) },
                        )
                    RefreshResult.Refreshed
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    RefreshResult.Failed
                }
            ApiOutcome.Unauthorized -> {
                continueListening.value = null
                RefreshResult.SignedOut
            }
            ApiOutcome.Failed -> {
                continueListening.value = null
                RefreshResult.Failed
            }
        }
    }
}
