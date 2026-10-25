package com.alexchoicy.music.data.home

import androidx.room3.Embedded
import androidx.room3.Entity
import androidx.room3.PrimaryKey
import androidx.room3.Relation
import com.alexchoicy.music.api.LibraryStats
import com.alexchoicy.music.data.library.AlbumEntity
import com.alexchoicy.music.data.library.AlbumWithArtists
import com.alexchoicy.music.data.library.PartyEntity

@Entity(tableName = "home")
data class HomeEntity(
    @PrimaryKey val id: Int = 0,
    @Embedded val stats: LibraryStats,
)

enum class HomeAlbumSection { RecentlyPlayed, RecentAlbums }

@Entity(tableName = "home_album", primaryKeys = ["section", "position"])
data class HomeAlbumEntity(
    val section: HomeAlbumSection,
    val position: Int,
    val albumId: Long,
)

@Entity(tableName = "home_party")
data class HomePartyEntity(
    @PrimaryKey val position: Int,
    val partyId: Long,
)

data class HomeAlbumWithAlbum(
    @Embedded val entry: HomeAlbumEntity,
    @Relation(entity = AlbumEntity::class, parentColumns = ["albumId"], entityColumns = ["id"])
    val album: AlbumWithArtists?,
)

data class HomePartyWithParty(
    @Embedded val entry: HomePartyEntity,
    @Relation(parentColumns = ["partyId"], entityColumns = ["id"])
    val party: PartyEntity?,
)
