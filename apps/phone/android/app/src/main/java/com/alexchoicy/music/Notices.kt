package com.alexchoicy.music

import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.receiveAsFlow

class Notices {
    private val channel =
        Channel<String>(capacity = 4, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    val messages = channel.receiveAsFlow()

    fun show(message: String) {
        channel.trySend(message)
    }
}
