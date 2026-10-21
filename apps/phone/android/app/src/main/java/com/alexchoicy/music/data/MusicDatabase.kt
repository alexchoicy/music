package com.alexchoicy.music.data

import androidx.room3.Database
import androidx.room3.RoomDatabase
import com.alexchoicy.music.data.home.HomeAlbumEntity
import com.alexchoicy.music.data.home.HomeContinueListeningEntity
import com.alexchoicy.music.data.home.HomeDao
import com.alexchoicy.music.data.home.HomeEntity
import com.alexchoicy.music.data.home.HomePartyEntity
import com.alexchoicy.music.data.library.AlbumArtistEntity
import com.alexchoicy.music.data.library.AlbumEntity
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
    ],
    version = 1,
)
abstract class MusicDatabase : RoomDatabase() {
    abstract fun homeDao(): HomeDao
}
