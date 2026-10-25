package com.alexchoicy.music.data

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
import com.alexchoicy.music.offline.OfflineAlbumEntity
import com.alexchoicy.music.offline.OfflineArtworkEntity
import com.alexchoicy.music.offline.OfflineDao
import com.alexchoicy.music.offline.OfflinePlaylistEntity
import com.alexchoicy.music.offline.OfflinePlaylistTrackEntity
import com.alexchoicy.music.offline.TrackDownloadArtistEntity
import com.alexchoicy.music.offline.TrackDownloadEntity
import com.alexchoicy.music.playback.QueueDao
import com.alexchoicy.music.playback.QueueEntryArtistEntity
import com.alexchoicy.music.playback.QueueEntryEntity
import com.alexchoicy.music.playback.QueuePlayOrderEntity
import com.alexchoicy.music.playback.QueueStateEntity

@Database(
    entities = [
        AlbumEntity::class,
        AlbumArtistEntity::class,
        PartyEntity::class,
        HomeEntity::class,
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
        OfflineAlbumEntity::class,
        OfflinePlaylistEntity::class,
        OfflinePlaylistTrackEntity::class,
        TrackDownloadEntity::class,
        TrackDownloadArtistEntity::class,
        OfflineArtworkEntity::class,
        QueueEntryEntity::class,
        QueueEntryArtistEntity::class,
        QueuePlayOrderEntity::class,
        QueueStateEntity::class,
    ],
    version = 1,
)
abstract class MusicDatabase : RoomDatabase() {
    abstract fun homeDao(): HomeDao

    abstract fun libraryDao(): LibraryDao

    abstract fun detailDao(): DetailDao

    abstract fun offlineDao(): OfflineDao

    abstract fun queueDao(): QueueDao
}
