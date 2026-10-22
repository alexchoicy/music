package com.alexchoicy.music.api

import io.ktor.client.request.parameter
import java.time.Instant
import java.time.OffsetDateTime
import kotlinx.serialization.Serializable

data class AlbumArtist(val partyId: Long, val name: String)

data class AlbumSummary(
    val id: Long,
    val title: String,
    val type: String,
    val coverUrl: String?,
    val artists: List<AlbumArtist>,
    val trackCount: Int,
    val totalDurationMs: Long,
    val languageId: Long?,
    val releaseDate: Instant?,
    val createdAt: Instant?,
) {
    val artistNames: String? get() = artists.joinToString(", ") { it.name }.ifEmpty { null }
}

data class PartySummary(
    val id: Long,
    val name: String,
    val coverUrl: String?,
    val albumCount: Int,
    val type: String?,
    val aliases: List<String>,
    val createdAt: Instant?,
)

data class Language(val id: Long, val name: String)

enum class ListSort { TitleAsc, TitleDesc, CreatedAtDesc, CreatedAtAsc }

enum class AlbumType { Album, Single, Compilation, Live, Soundtrack, Remix, Other }

enum class PartyType { Individual, Group, Project }

class LibraryApi(private val client: ApiClient) {
    suspend fun fetchAlbums(): ApiOutcome<List<AlbumSummary>> = apiOutcome {
        client.get<List<AlbumDto>>("/albums").map { it.toAlbum() }
    }

    suspend fun fetchParties(): ApiOutcome<List<PartySummary>> = apiOutcome {
        client.get<List<PartyDto>>("/parties") {
            parameter("ExcludeNoAlbums", true)
        }.map { it.toParty() }
    }

    suspend fun fetchLanguages(): ApiOutcome<List<Language>> = apiOutcome {
        client.get<List<LanguageDto>>("/languages").map { Language(it.id, it.language) }
    }
}

@Serializable
internal class AlbumDto(
    val albumId: Long,
    val title: String,
    val type: String,
    val coverVariants: ImageVariantsDto? = null,
    val discCovers: List<DiscCoverDto> = emptyList(),
    val artists: List<ArtistDto>,
    val trackCount: Int,
    val totalDurationInMs: Long,
    val languageId: Long? = null,
    val releaseDate: String? = null,
    val createdAt: String? = null,
)

@Serializable
internal class PartyDto(
    val partyId: Long,
    val name: String,
    val coverUrl: String? = null,
    val albumCount: Int,
    val type: String? = null,
    val aliases: List<AliasDto> = emptyList(),
    val createdAt: String? = null,
)

@Serializable
internal class AliasDto(val name: String)

@Serializable
internal class DiscCoverDto(val variants: ImageVariantsDto)

@Serializable
internal class ArtistDto(val partyId: Long, val name: String)

@Serializable
internal class ImageVariantsDto(
    val original: FileDto? = null,
    val imageCover1024x1024: FileDto? = null,
    val imageAvatar512x512: FileDto? = null,
)

@Serializable
internal class FileDto(val url: String)

@Serializable
private class LanguageDto(val id: Long, val language: String)

internal fun parseInstant(value: String?): Instant? =
    value?.let { runCatching { OffsetDateTime.parse(it).toInstant() }.getOrNull() }

internal fun AlbumDto.toAlbum() = AlbumSummary(
    id = albumId,
    title = title,
    type = type,
    coverUrl = coverVariants?.url { imageCover1024x1024 }
        ?: discCovers.firstOrNull()?.variants?.url { imageCover1024x1024 },
    artists = artists.map { AlbumArtist(it.partyId, it.name) },
    trackCount = trackCount,
    totalDurationMs = totalDurationInMs,
    languageId = languageId,
    releaseDate = parseInstant(releaseDate),
    createdAt = parseInstant(createdAt),
)

internal fun PartyDto.toParty() = PartySummary(
    id = partyId,
    name = name,
    coverUrl = coverUrl?.ifEmpty { null },
    albumCount = albumCount,
    type = type,
    aliases = aliases.map { it.name },
    createdAt = parseInstant(createdAt),
)

internal fun ImageVariantsDto.url(variant: ImageVariantsDto.() -> FileDto?): String? =
    (variant() ?: original)?.url?.ifEmpty { null }
