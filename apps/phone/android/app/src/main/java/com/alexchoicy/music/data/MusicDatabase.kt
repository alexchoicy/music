package com.alexchoicy.music.data

import androidx.room3.AutoMigration
import androidx.room3.Database
import androidx.room3.RoomDatabase
import com.alexchoicy.music.data.detail.AlbumCreditEntity
import com.alexchoicy.music.data.detail.AlbumDetailEntity
import com.alexchoicy.music.data.detail.AlbumDiscEntity
import com.alexchoicy.music.data.detail.AlbumTrackCreditEntity
import com.alexchoicy.music.data.detail.AlbumTrackEntity
import com.alexchoicy.music.data.detail.DetailDao
import com.alexchoicy.music.data.detail.PartyAlbumEntity
import com.alexchoicy.music.data.detail.PartyDetailEntity
import com.alexchoicy.music.data.detail.PartyLinkEntity
import com.alexchoicy.music.data.detail.PartyMemberEntity
import com.alexchoicy.music.data.home.HomeAlbumEntity
import com.alexchoicy.music.data.home.HomeContinueListeningEntity
import com.alexchoicy.music.data.home.HomeDao
import com.alexchoicy.music.data.home.HomeEntity
import com.alexchoicy.music.data.home.HomePartyEntity
import com.alexchoicy.music.data.library.AlbumArtistEntity
import com.alexchoicy.music.data.library.AlbumEntity
import com.alexchoicy.music.data.library.LanguageEntity
import com.alexchoicy.music.data.library.LibraryAlbumEntity
import com.alexchoicy.music.data.library.LibraryDao
import com.alexchoicy.music.data.library.LibraryPartyEntity
import com.alexchoicy.music.data.library.LibrarySyncEntity
import com.alexchoicy.music.data.library.PartyEntity

@Database(
    entities = [
        AlbumEntity::class,
        AlbumArtistEntity::class,
        PartyEntity::class,
        HomeEntity::class,
        HomeContinueListeningEntity::class,
        HomeAlbumEntity::class,
        HomePartyEntity::class,
        LibraryAlbumEntity::class,
        LibraryPartyEntity::class,
        LanguageEntity::class,
        LibrarySyncEntity::class,
        AlbumDetailEntity::class,
        AlbumCreditEntity::class,
        AlbumDiscEntity::class,
        AlbumTrackEntity::class,
        AlbumTrackCreditEntity::class,
        PartyDetailEntity::class,
        PartyLinkEntity::class,
        PartyAlbumEntity::class,
        PartyMemberEntity::class,
    ],
    version = 4,
    autoMigrations = [
        AutoMigration(from = 1, to = 2),
        AutoMigration(from = 2, to = 3),
        AutoMigration(from = 3, to = 4),
    ],
)
abstract class MusicDatabase : RoomDatabase() {
    abstract fun homeDao(): HomeDao
    abstract fun libraryDao(): LibraryDao
    abstract fun detailDao(): DetailDao
}
