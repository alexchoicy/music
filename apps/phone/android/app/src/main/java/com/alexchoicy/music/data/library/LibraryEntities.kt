package com.alexchoicy.music.data.library

import androidx.room3.ColumnInfo
import androidx.room3.Embedded
import androidx.room3.Entity
import androidx.room3.PrimaryKey
import androidx.room3.Relation
import com.alexchoicy.music.api.AlbumArtist
import com.alexchoicy.music.api.AlbumSummary
import com.alexchoicy.music.api.Language
import com.alexchoicy.music.api.PartySummary
import java.text.Normalizer
import java.time.Instant

internal const val ALIAS_SEPARATOR = "\n"

@Entity(tableName = "album")
data class AlbumEntity(
    @PrimaryKey val id: Long,
    val title: String,
    val type: String,
    val coverUrl: String?,
    val trackCount: Int,
    val totalDurationMs: Long,
    val languageId: Long?,
    val releaseDateMs: Long?,
    val createdAtMs: Long?,
    @ColumnInfo(defaultValue = "") val searchText: String,
)

@Entity(tableName = "album_artist", primaryKeys = ["albumId", "position"])
data class AlbumArtistEntity(
    val albumId: Long,
    val position: Int,
    val partyId: Long,
    val name: String,
)

@Entity(tableName = "party")
data class PartyEntity(
    @PrimaryKey val id: Long,
    val name: String,
    val coverUrl: String?,
    val albumCount: Int,
    val type: String?,
    @ColumnInfo(defaultValue = "") val aliases: String,
    val createdAtMs: Long?,
    @ColumnInfo(defaultValue = "") val searchText: String,
)

@Entity(tableName = "library_album")
data class LibraryAlbumEntity(
    @PrimaryKey val albumId: Long,
)

@Entity(tableName = "library_party")
data class LibraryPartyEntity(
    @PrimaryKey val partyId: Long,
)

@Entity(tableName = "language")
data class LanguageEntity(
    @PrimaryKey val id: Long,
    @ColumnInfo(collate = ColumnInfo.UNICODE) val name: String,
)

enum class LibraryKind { Albums, Parties }

@Entity(tableName = "library_sync")
data class LibrarySyncEntity(
    @PrimaryKey val kind: LibraryKind,
    val syncedAtMs: Long,
)

data class AlbumWithArtists(
    @Embedded val album: AlbumEntity,
    @Relation(parentColumns = ["id"], entityColumns = ["albumId"])
    val artists: List<AlbumArtistEntity>,
) {
    fun toSummary() =
        AlbumSummary(
            id = album.id,
            title = album.title,
            type = album.type,
            coverUrl = album.coverUrl,
            artists = artists.sortedBy { it.position }.map { AlbumArtist(it.partyId, it.name) },
            trackCount = album.trackCount,
            totalDurationMs = album.totalDurationMs,
            languageId = album.languageId,
            releaseDate = album.releaseDateMs?.let(Instant::ofEpochMilli),
            createdAt = album.createdAtMs?.let(Instant::ofEpochMilli),
        )
}

fun AlbumSummary.toEntity() =
    AlbumEntity(
        id = id,
        title = title,
        type = type,
        coverUrl = coverUrl,
        trackCount = trackCount,
        totalDurationMs = totalDurationMs,
        languageId = languageId,
        releaseDateMs = releaseDate?.toEpochMilli(),
        createdAtMs = createdAt?.toEpochMilli(),
        searchText = searchKey(title),
    )

fun AlbumSummary.toArtistEntities() =
    artists.mapIndexed { position, artist ->
        AlbumArtistEntity(id, position, artist.partyId, artist.name)
    }

fun PartyEntity.toSummary() =
    PartySummary(
        id = id,
        name = name,
        coverUrl = coverUrl,
        albumCount = albumCount,
        type = type,
        aliases = aliases.split(ALIAS_SEPARATOR).filter { it.isNotEmpty() },
        createdAt = createdAtMs?.let(Instant::ofEpochMilli),
    )

fun PartySummary.toEntity() =
    PartyEntity(
        id = id,
        name = name,
        coverUrl = coverUrl,
        albumCount = albumCount,
        type = type,
        aliases = aliases.joinToString(ALIAS_SEPARATOR),
        createdAtMs = createdAt?.toEpochMilli(),
        searchText = (listOf(name) + aliases).joinToString(" ") { searchKey(it) },
    )

fun LanguageEntity.toLanguage() = Language(id, name)

fun Language.toEntity() = LanguageEntity(id, name)

// Mirrors the server's matching: accents removed, case folded, only letters and digits kept.
// Keys never contain spaces, so space-joined keys cannot match across names.
fun searchKey(text: String): String {
    val decomposed =
        Normalizer
            .normalize(text, Normalizer.Form.NFKD)
            .filterNot { Character.getType(it) == Character.NON_SPACING_MARK.toInt() }
    val folded = Normalizer.normalize(decomposed, Normalizer.Form.NFKC).uppercase()
    return buildString {
        folded.codePoints().forEach { if (Character.isLetterOrDigit(it)) appendCodePoint(it) }
    }
}
