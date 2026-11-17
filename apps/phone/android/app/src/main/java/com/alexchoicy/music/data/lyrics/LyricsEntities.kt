package com.alexchoicy.music.data.lyrics

import androidx.room3.Entity
import androidx.room3.ForeignKey
import androidx.room3.PrimaryKey
import com.alexchoicy.music.api.ApiJson
import com.alexchoicy.music.api.LyricVersion
import com.alexchoicy.music.api.Lyrics

@Entity(tableName = "track_lyrics")
data class TrackLyricsEntity(
    @PrimaryKey val trackId: Long,
)

@Entity(
    tableName = "lyric_version",
    primaryKeys = ["trackId", "position"],
    foreignKeys = [
        ForeignKey(
            entity = TrackLyricsEntity::class,
            parentColumns = ["trackId"],
            childColumns = ["trackId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
)
data class LyricVersionEntity(
    val trackId: Long,
    val position: Int,
    val subtitleId: Long,
    val title: String?,
    val format: String,
    val languageId: Long?,
    val languageName: String?,
)

@Entity(tableName = "lyrics")
data class LyricsEntity(
    @PrimaryKey val subtitleId: Long,
    val lyrics: String,
)

fun LyricVersion.toEntity(
    trackId: Long,
    position: Int,
) = LyricVersionEntity(trackId, position, subtitleId, title, format, languageId, languageName)

fun LyricVersionEntity.toVersion() = LyricVersion(subtitleId, title, format, languageId, languageName)

fun Lyrics.toEntity() = LyricsEntity(subtitleId, ApiJson.encodeToString(Lyrics.serializer(), this))

fun LyricsEntity.toLyrics(): Lyrics? = runCatching { ApiJson.decodeFromString(Lyrics.serializer(), lyrics) }.getOrNull()
