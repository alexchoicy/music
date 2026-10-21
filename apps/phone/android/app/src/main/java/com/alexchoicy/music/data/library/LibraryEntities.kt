package com.alexchoicy.music.data.library

import androidx.room3.Embedded
import androidx.room3.Entity
import androidx.room3.PrimaryKey
import androidx.room3.Relation
import com.alexchoicy.music.api.AlbumArtist
import com.alexchoicy.music.api.AlbumSummary
import com.alexchoicy.music.api.PartySummary

@Entity(tableName = "album")
data class AlbumEntity(
    @PrimaryKey val id: Long,
    val title: String,
    val type: String,
    val coverUrl: String?,
    val trackCount: Int,
    val totalDurationMs: Long,
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
)

data class AlbumWithArtists(
    @Embedded val album: AlbumEntity,
    @Relation(parentColumns = ["id"], entityColumns = ["albumId"])
    val artists: List<AlbumArtistEntity>,
) {
    fun toSummary() = AlbumSummary(
        id = album.id,
        title = album.title,
        type = album.type,
        coverUrl = album.coverUrl,
        artists = artists.sortedBy { it.position }.map { AlbumArtist(it.partyId, it.name) },
        trackCount = album.trackCount,
        totalDurationMs = album.totalDurationMs,
    )
}

fun AlbumSummary.toEntity() = AlbumEntity(id, title, type, coverUrl, trackCount, totalDurationMs)

fun AlbumSummary.toArtistEntities() = artists.mapIndexed { position, artist ->
    AlbumArtistEntity(id, position, artist.partyId, artist.name)
}

fun PartyEntity.toSummary() = PartySummary(id, name, coverUrl, albumCount)

fun PartySummary.toEntity() = PartyEntity(id, name, coverUrl, albumCount)
