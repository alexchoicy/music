package com.alexchoicy.music.api

import java.time.Instant
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.serialization.Serializable

data class Credit(
    val partyId: Long,
    val name: String,
    val creditType: String,
    val avatarUrl: String?,
)

data class AlbumTrack(
    val trackId: Long,
    val trackNumber: Int,
    val title: String,
    val durationMs: Long,
    val contentType: String,
    val versionType: String,
    val credits: List<Credit>,
)

data class AlbumDisc(
    val id: Long,
    val discNumber: Int,
    val subtitle: String?,
    val tracks: List<AlbumTrack>,
)

data class AlbumDetail(
    val id: Long,
    val title: String,
    val type: String,
    val releaseDate: Instant?,
    val trackCount: Int,
    val totalDurationMs: Long,
    val coverUrl: String?,
    val credits: List<Credit>,
    val discs: List<AlbumDisc>,
)

data class ExternalLink(val type: String, val url: String)

data class PartyMember(val partyId: Long, val name: String, val avatarUrl: String?)

data class PartyDetail(
    val id: Long,
    val name: String,
    val avatarUrl: String?,
    val description: String,
    val type: String?,
    val kind: String,
    val gender: String?,
    val country: String,
    val aliases: List<String>,
    val links: List<ExternalLink>,
    val albums: List<AlbumSummary>,
    val appearsOn: List<AlbumSummary>,
    val members: List<PartyMember>,
)

class DetailApi(private val client: ApiClient) {
    suspend fun fetchAlbum(id: Long): ApiOutcome<AlbumDetail> = apiOutcome {
        client.get<AlbumDetailDto>("/albums/$id").toDetail()
    }

    suspend fun fetchParty(id: Long): ApiOutcome<PartyDetail> = apiOutcome {
        coroutineScope {
            val graph = async { client.get<RelationshipGraphDto>("/parties/$id/relationships") }
            client.get<PartyDetailDto>("/parties/$id").toDetail(graph.await())
        }
    }
}

@Serializable
private class AlbumDetailDto(
    val albumId: Long,
    val title: String,
    val type: String,
    val releaseDate: String? = null,
    val totalTrackCount: Int,
    val totalDurationInMs: Long,
    val cover: AlbumCoverDto,
    val credits: List<CreditDto>,
    val discs: List<AlbumDiscDto>,
)

@Serializable
private class AlbumCoverDto(
    val album: ImageVariantsDto? = null,
    val discs: List<DiscCoverDto> = emptyList(),
)

@Serializable
private class CreditDto(
    val partyId: Long,
    val name: String,
    val creditType: String,
    val avatar: ImageVariantsDto? = null,
)

@Serializable
private class AlbumDiscDto(
    val albumDiscId: Long,
    val discNumber: Int,
    val subtitle: String? = null,
    val tracks: List<AlbumTrackDto>,
)

@Serializable
private class AlbumTrackDto(
    val trackId: Long,
    val trackNumber: Int,
    val title: String,
    val durationInMs: Long,
    val contentType: String,
    val versionType: String,
    val credits: List<CreditDto>,
)

@Serializable
private class PartyDetailDto(
    val partyId: Long,
    val name: String,
    val avatarImages: ImageVariantsDto? = null,
    val description: String = "",
    val type: String? = null,
    val kind: String,
    val gender: String? = null,
    val country: String,
    val aliases: List<AliasDto> = emptyList(),
    val externalInfoLinks: List<ExternalLinkDto> = emptyList(),
    val albums: List<AlbumDto>,
    val appearsOnAlbums: List<AlbumDto>,
)

@Serializable
private class ExternalLinkDto(val type: String, val url: String)

@Serializable
private class RelationshipGraphDto(
    val parties: List<GraphPartyDto>,
    val relationships: List<RelationshipDto>,
)

@Serializable
private class GraphPartyDto(
    val partyId: Long,
    val name: String,
    val avatarImages: ImageVariantsDto? = null,
)

@Serializable
private class RelationshipDto(val sourcePartyId: Long, val targetPartyId: Long, val type: String)

private fun AlbumDetailDto.toDetail() = AlbumDetail(
    id = albumId,
    title = title,
    type = type,
    releaseDate = parseInstant(releaseDate),
    trackCount = totalTrackCount,
    totalDurationMs = totalDurationInMs,
    coverUrl = cover.album?.url { imageCover1024x1024 }
        ?: cover.discs.firstOrNull()?.variants?.url { imageCover1024x1024 },
    credits = credits.map { it.toCredit() },
    discs = discs.map { disc ->
        AlbumDisc(
            id = disc.albumDiscId,
            discNumber = disc.discNumber,
            subtitle = disc.subtitle?.ifBlank { null },
            tracks = disc.tracks.map { track ->
                AlbumTrack(
                    trackId = track.trackId,
                    trackNumber = track.trackNumber,
                    title = track.title,
                    durationMs = track.durationInMs,
                    contentType = track.contentType,
                    versionType = track.versionType,
                    credits = track.credits.map { it.toCredit() },
                )
            },
        )
    },
)

private fun CreditDto.toCredit() = Credit(
    partyId = partyId,
    name = name,
    creditType = creditType,
    avatarUrl = avatar?.url { imageAvatar512x512 },
)

private fun PartyDetailDto.toDetail(graph: RelationshipGraphDto) = PartyDetail(
    id = partyId,
    name = name,
    avatarUrl = avatarImages?.url { imageAvatar512x512 },
    description = description.trim(),
    type = type,
    kind = kind,
    gender = gender,
    country = country,
    aliases = aliases.map { it.name }.filter { it.isNotBlank() },
    links = externalInfoLinks.map { ExternalLink(it.type, it.url) },
    albums = albums.map { it.toAlbum() },
    appearsOn = appearsOnAlbums.map { it.toAlbum() },
    members = graph.members(partyId),
)

private fun RelationshipGraphDto.members(groupId: Long): List<PartyMember> {
    val partiesById = parties.associateBy { it.partyId }
    return relationships
        .filter { it.type == "MemberOf" && it.targetPartyId == groupId }
        .mapNotNull { partiesById[it.sourcePartyId] }
        .distinctBy { it.partyId }
        .sortedBy { it.name }
        .map { PartyMember(it.partyId, it.name, it.avatarImages?.url { imageAvatar512x512 }) }
}
