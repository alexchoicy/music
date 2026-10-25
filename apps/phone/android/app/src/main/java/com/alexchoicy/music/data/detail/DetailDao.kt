package com.alexchoicy.music.data.detail

import androidx.room3.Dao
import androidx.room3.Insert
import androidx.room3.Query
import androidx.room3.Transaction
import androidx.room3.Upsert
import com.alexchoicy.music.api.AlbumDetail
import com.alexchoicy.music.api.AlbumDisc
import com.alexchoicy.music.api.AlbumTrack
import com.alexchoicy.music.api.ExternalLink
import com.alexchoicy.music.api.PartyDetail
import com.alexchoicy.music.api.PartyMember
import com.alexchoicy.music.data.MusicDatabase
import com.alexchoicy.music.data.library.ALIAS_SEPARATOR
import com.alexchoicy.music.data.library.AlbumWithArtists
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.Instant

@Dao
abstract class DetailDao(
    private val database: MusicDatabase,
) {
    fun observeAlbum(id: Long): Flow<AlbumDetail?> =
        database.invalidationTracker
            .createFlow(
                "album_detail",
                "album_credit",
                "album_disc",
                "album_track",
                "album_track_credit",
            ).map { loadAlbum(id) }

    fun observeParty(id: Long): Flow<PartyDetail?> =
        database.invalidationTracker
            .createFlow(
                "party_detail",
                "party_link",
                "party_album",
                "party_member",
                "album",
                "album_artist",
            ).map { loadParty(id) }

    @Transaction
    open suspend fun loadAlbum(id: Long): AlbumDetail? {
        val album = albumDetail(id) ?: return null
        val tracks = albumTracks(id).groupBy { it.discId }
        val trackCredits = albumTrackCredits(id).groupBy { it.discId to it.trackPosition }
        return AlbumDetail(
            id = album.id,
            title = album.title,
            type = album.type,
            releaseDate = album.releaseDateMs?.let(Instant::ofEpochMilli),
            trackCount = album.trackCount,
            totalDurationMs = album.totalDurationMs,
            coverUrl = album.coverUrl,
            shareUrl = album.shareUrl,
            credits = albumCredits(id).map { it.toCredit() },
            discs =
                albumDiscs(id).map { disc ->
                    AlbumDisc(
                        id = disc.id,
                        discNumber = disc.discNumber,
                        subtitle = disc.subtitle,
                        tracks =
                            tracks[disc.id].orEmpty().map { track ->
                                AlbumTrack(
                                    trackId = track.trackId,
                                    trackNumber = track.trackNumber,
                                    title = track.title,
                                    durationMs = track.durationMs,
                                    contentType = track.contentType,
                                    versionType = track.versionType,
                                    credits =
                                        trackCredits[disc.id to track.position]
                                            .orEmpty()
                                            .map { it.toCredit() },
                                )
                            },
                    )
                },
        )
    }

    @Transaction
    open suspend fun loadParty(id: Long): PartyDetail? {
        val party = partyDetail(id) ?: return null
        return PartyDetail(
            id = party.id,
            name = party.name,
            avatarUrl = party.avatarUrl,
            description = party.description,
            type = party.type,
            kind = party.kind,
            gender = party.gender,
            country = party.country,
            aliases = party.aliases.split(ALIAS_SEPARATOR).filter { it.isNotEmpty() },
            links = partyLinks(id).map { ExternalLink(it.type, it.url) },
            albums = partyAlbums(id, PartyAlbumRole.Credited).map { it.toSummary() },
            appearsOn = partyAlbums(id, PartyAlbumRole.AppearsOn).map { it.toSummary() },
            members = partyMembers(id).map { PartyMember(it.memberId, it.name, it.avatarUrl) },
        )
    }

    @Transaction
    open suspend fun replaceAlbum(album: AlbumDetail) {
        deleteAlbumTrackCredits(album.id)
        deleteAlbumTracks(album.id)
        deleteAlbumDiscs(album.id)
        deleteAlbumCredits(album.id)
        upsertAlbumDetail(
            AlbumDetailEntity(
                id = album.id,
                title = album.title,
                type = album.type,
                releaseDateMs = album.releaseDate?.toEpochMilli(),
                trackCount = album.trackCount,
                totalDurationMs = album.totalDurationMs,
                coverUrl = album.coverUrl,
                shareUrl = album.shareUrl,
            ),
        )
        insertAlbumCredits(
            album.credits.mapIndexed { position, credit ->
                AlbumCreditEntity(
                    albumId = album.id,
                    position = position,
                    partyId = credit.partyId,
                    name = credit.name,
                    creditType = credit.creditType,
                    avatarUrl = credit.avatarUrl,
                )
            },
        )
        insertAlbumDiscs(
            album.discs.mapIndexed { position, disc ->
                AlbumDiscEntity(disc.id, album.id, position, disc.discNumber, disc.subtitle)
            },
        )
        insertAlbumTracks(
            album.discs.flatMap { disc ->
                disc.tracks.mapIndexed { position, track ->
                    AlbumTrackEntity(
                        discId = disc.id,
                        position = position,
                        trackId = track.trackId,
                        trackNumber = track.trackNumber,
                        title = track.title,
                        durationMs = track.durationMs,
                        contentType = track.contentType,
                        versionType = track.versionType,
                    )
                }
            },
        )
        insertAlbumTrackCredits(
            album.discs.flatMap { disc ->
                disc.tracks.flatMapIndexed { trackPosition, track ->
                    track.credits.mapIndexed { position, credit ->
                        AlbumTrackCreditEntity(
                            discId = disc.id,
                            trackPosition = trackPosition,
                            position = position,
                            partyId = credit.partyId,
                            name = credit.name,
                            creditType = credit.creditType,
                            avatarUrl = credit.avatarUrl,
                        )
                    }
                }
            },
        )
    }

    @Transaction
    open suspend fun replaceParty(party: PartyDetail) {
        database.libraryDao().upsertAlbums((party.albums + party.appearsOn).distinctBy { it.id })
        deletePartyLinks(party.id)
        deletePartyAlbums(party.id)
        deletePartyMembers(party.id)
        upsertPartyDetail(
            PartyDetailEntity(
                id = party.id,
                name = party.name,
                avatarUrl = party.avatarUrl,
                description = party.description,
                type = party.type,
                kind = party.kind,
                gender = party.gender,
                country = party.country,
                aliases = party.aliases.joinToString(ALIAS_SEPARATOR),
            ),
        )
        insertPartyLinks(
            party.links.mapIndexed { position, link ->
                PartyLinkEntity(party.id, position, link.type, link.url)
            },
        )
        insertPartyAlbums(
            party.albums.mapIndexed { position, album ->
                PartyAlbumEntity(party.id, PartyAlbumRole.Credited, position, album.id)
            } +
                party.appearsOn.mapIndexed { position, album ->
                    PartyAlbumEntity(party.id, PartyAlbumRole.AppearsOn, position, album.id)
                },
        )
        insertPartyMembers(
            party.members.mapIndexed { position, member ->
                PartyMemberEntity(party.id, position, member.partyId, member.name, member.avatarUrl)
            },
        )
    }

    @Query("SELECT * FROM album_detail WHERE id = :id")
    protected abstract suspend fun albumDetail(id: Long): AlbumDetailEntity?

    @Query("SELECT * FROM album_credit WHERE albumId = :albumId ORDER BY position")
    protected abstract suspend fun albumCredits(albumId: Long): List<AlbumCreditEntity>

    @Query("SELECT * FROM album_disc WHERE albumId = :albumId ORDER BY position")
    protected abstract suspend fun albumDiscs(albumId: Long): List<AlbumDiscEntity>

    @Query(
        "SELECT album_track.* FROM album_track " +
            "INNER JOIN album_disc ON album_disc.id = album_track.discId " +
            "WHERE album_disc.albumId = :albumId ORDER BY album_track.position",
    )
    protected abstract suspend fun albumTracks(albumId: Long): List<AlbumTrackEntity>

    @Query(
        "SELECT album_track_credit.* FROM album_track_credit " +
            "INNER JOIN album_disc ON album_disc.id = album_track_credit.discId " +
            "WHERE album_disc.albumId = :albumId ORDER BY album_track_credit.position",
    )
    protected abstract suspend fun albumTrackCredits(albumId: Long): List<AlbumTrackCreditEntity>

    @Query("SELECT * FROM party_detail WHERE id = :id")
    protected abstract suspend fun partyDetail(id: Long): PartyDetailEntity?

    @Query("SELECT * FROM party_link WHERE partyId = :partyId ORDER BY position")
    protected abstract suspend fun partyLinks(partyId: Long): List<PartyLinkEntity>

    @Transaction
    @Query(
        "SELECT album.* FROM party_album " +
            "INNER JOIN album ON album.id = party_album.albumId " +
            "WHERE party_album.partyId = :partyId AND party_album.role = :role " +
            "ORDER BY party_album.position",
    )
    protected abstract suspend fun partyAlbums(
        partyId: Long,
        role: PartyAlbumRole,
    ): List<AlbumWithArtists>

    @Query(
        "DELETE FROM album_track_credit WHERE discId IN " +
            "(SELECT id FROM album_disc WHERE albumId = :albumId)",
    )
    protected abstract suspend fun deleteAlbumTrackCredits(albumId: Long)

    @Query(
        "DELETE FROM album_track WHERE discId IN " +
            "(SELECT id FROM album_disc WHERE albumId = :albumId)",
    )
    protected abstract suspend fun deleteAlbumTracks(albumId: Long)

    @Query("DELETE FROM album_disc WHERE albumId = :albumId")
    protected abstract suspend fun deleteAlbumDiscs(albumId: Long)

    @Query("DELETE FROM album_credit WHERE albumId = :albumId")
    protected abstract suspend fun deleteAlbumCredits(albumId: Long)

    @Upsert
    protected abstract suspend fun upsertAlbumDetail(album: AlbumDetailEntity)

    @Insert
    protected abstract suspend fun insertAlbumCredits(credits: List<AlbumCreditEntity>)

    @Insert
    protected abstract suspend fun insertAlbumDiscs(discs: List<AlbumDiscEntity>)

    @Insert
    protected abstract suspend fun insertAlbumTracks(tracks: List<AlbumTrackEntity>)

    @Insert
    protected abstract suspend fun insertAlbumTrackCredits(credits: List<AlbumTrackCreditEntity>)

    @Query("SELECT * FROM party_member WHERE partyId = :partyId ORDER BY position")
    protected abstract suspend fun partyMembers(partyId: Long): List<PartyMemberEntity>

    @Query("DELETE FROM party_link WHERE partyId = :partyId")
    protected abstract suspend fun deletePartyLinks(partyId: Long)

    @Query("DELETE FROM party_album WHERE partyId = :partyId")
    protected abstract suspend fun deletePartyAlbums(partyId: Long)

    @Query("DELETE FROM party_member WHERE partyId = :partyId")
    protected abstract suspend fun deletePartyMembers(partyId: Long)

    @Upsert
    protected abstract suspend fun upsertPartyDetail(party: PartyDetailEntity)

    @Insert
    protected abstract suspend fun insertPartyLinks(links: List<PartyLinkEntity>)

    @Insert
    protected abstract suspend fun insertPartyAlbums(albums: List<PartyAlbumEntity>)

    @Insert
    protected abstract suspend fun insertPartyMembers(members: List<PartyMemberEntity>)
}
