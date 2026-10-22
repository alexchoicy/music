package com.alexchoicy.music.data.detail

import androidx.room3.Entity
import androidx.room3.Index
import androidx.room3.PrimaryKey
import com.alexchoicy.music.api.Credit

@Entity(tableName = "album_detail")
data class AlbumDetailEntity(
    @PrimaryKey val id: Long,
    val title: String,
    val type: String,
    val releaseDateMs: Long?,
    val trackCount: Int,
    val totalDurationMs: Long,
    val coverUrl: String?,
)

@Entity(tableName = "album_credit", primaryKeys = ["albumId", "position"])
data class AlbumCreditEntity(
    val albumId: Long,
    val position: Int,
    val partyId: Long,
    val name: String,
    val creditType: String,
    val avatarUrl: String?,
)

@Entity(tableName = "album_disc", indices = [Index("albumId")])
data class AlbumDiscEntity(
    @PrimaryKey val id: Long,
    val albumId: Long,
    val position: Int,
    val discNumber: Int,
    val subtitle: String?,
)

@Entity(tableName = "album_track", primaryKeys = ["discId", "position"])
data class AlbumTrackEntity(
    val discId: Long,
    val position: Int,
    val trackId: Long,
    val trackNumber: Int,
    val title: String,
    val durationMs: Long,
    val contentType: String,
    val versionType: String,
)

@Entity(tableName = "album_track_credit", primaryKeys = ["discId", "trackPosition", "position"])
data class AlbumTrackCreditEntity(
    val discId: Long,
    val trackPosition: Int,
    val position: Int,
    val partyId: Long,
    val name: String,
    val creditType: String,
    val avatarUrl: String?,
)

@Entity(tableName = "party_detail")
data class PartyDetailEntity(
    @PrimaryKey val id: Long,
    val name: String,
    val avatarUrl: String?,
    val description: String,
    val type: String?,
    val kind: String,
    val gender: String?,
    val country: String,
    val aliases: String,
)

@Entity(tableName = "party_link", primaryKeys = ["partyId", "position"])
data class PartyLinkEntity(val partyId: Long, val position: Int, val type: String, val url: String)

@Entity(tableName = "party_member", primaryKeys = ["partyId", "position"])
data class PartyMemberEntity(
    val partyId: Long,
    val position: Int,
    val memberId: Long,
    val name: String,
    val avatarUrl: String?,
)

enum class PartyAlbumRole { Credited, AppearsOn }

@Entity(tableName = "party_album", primaryKeys = ["partyId", "role", "position"])
data class PartyAlbumEntity(
    val partyId: Long,
    val role: PartyAlbumRole,
    val position: Int,
    val albumId: Long,
)

fun AlbumCreditEntity.toCredit() = Credit(partyId, name, creditType, avatarUrl)

fun AlbumTrackCreditEntity.toCredit() = Credit(partyId, name, creditType, avatarUrl)
