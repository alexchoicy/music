package com.alexchoicy.music.data.library

import androidx.room3.Dao
import androidx.room3.Insert
import androidx.room3.Query
import androidx.room3.RawQuery
import androidx.room3.RoomRawQuery
import androidx.room3.Transaction
import androidx.room3.Upsert
import com.alexchoicy.music.api.AlbumSummary
import com.alexchoicy.music.api.Language
import com.alexchoicy.music.api.ListSort
import com.alexchoicy.music.api.PartySummary
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private const val MAX_BIND_ARGS = 500

@Dao
abstract class LibraryDao {
    fun observeAlbums(query: AlbumQuery): Flow<List<AlbumSummary>> {
        val filter = SqlFilter()
        filter.search("album.searchText", query.search)
        filter.anyOf("album.type", query.types.map { it.name })
        filter.anyOf("album.languageId", query.languageIds.toList())
        val sql = "SELECT album.* FROM album " +
            "INNER JOIN library_album ON library_album.albumId = album.id" +
            filter.where() + orderBy(query.sort, "album.title", "album.createdAtMs")
        return observeAlbums(filter.toQuery(sql)).map { albums -> albums.map { it.toSummary() } }
    }

    fun observeParties(query: PartyQuery): Flow<List<PartySummary>> {
        val filter = SqlFilter()
        filter.search("party.searchText", query.search)
        filter.anyOf("party.type", listOfNotNull(query.type?.name))
        val sql = "SELECT party.* FROM party " +
            "INNER JOIN library_party ON library_party.partyId = party.id" +
            filter.where() + orderBy(query.sort, "party.name", "party.createdAtMs")
        return observeParties(filter.toQuery(sql)).map { parties -> parties.map { it.toSummary() } }
    }

    fun observeLanguages(): Flow<List<Language>> =
        observeLanguageEntities().map { languages -> languages.map { it.toLanguage() } }

    @Query("SELECT EXISTS(SELECT 1 FROM library_sync WHERE kind = :kind)")
    abstract fun observeSynced(kind: LibraryKind): Flow<Boolean>

    @Transaction
    open suspend fun replaceAlbums(albums: List<AlbumSummary>, languages: List<Language>?) {
        upsertAlbums(albums)
        deleteLibraryAlbums()
        insertLibraryAlbums(albums.map { LibraryAlbumEntity(it.id) })
        if (languages != null) {
            deleteLanguages()
            insertLanguages(languages.map { it.toEntity() })
        }
        upsertSync(LibrarySyncEntity(LibraryKind.Albums, System.currentTimeMillis()))
    }

    @Transaction
    open suspend fun replaceParties(parties: List<PartySummary>) {
        upsertParties(parties.map { it.toEntity() })
        deleteLibraryParties()
        insertLibraryParties(parties.map { LibraryPartyEntity(it.id) })
        upsertSync(LibrarySyncEntity(LibraryKind.Parties, System.currentTimeMillis()))
    }

    @Transaction
    open suspend fun upsertAlbums(albums: List<AlbumSummary>) {
        upsertAlbumEntities(albums.map { it.toEntity() })
        albums.map { it.id }.chunked(MAX_BIND_ARGS).forEach { deleteAlbumArtists(it) }
        insertAlbumArtists(albums.flatMap { it.toArtistEntities() })
    }

    @Transaction
    @RawQuery(observedEntities = [AlbumEntity::class, AlbumArtistEntity::class, LibraryAlbumEntity::class])
    protected abstract fun observeAlbums(query: RoomRawQuery): Flow<List<AlbumWithArtists>>

    @RawQuery(observedEntities = [PartyEntity::class, LibraryPartyEntity::class])
    protected abstract fun observeParties(query: RoomRawQuery): Flow<List<PartyEntity>>

    @Query("SELECT * FROM language ORDER BY name")
    protected abstract fun observeLanguageEntities(): Flow<List<LanguageEntity>>

    @Upsert
    protected abstract suspend fun upsertAlbumEntities(albums: List<AlbumEntity>)

    @Query("DELETE FROM album_artist WHERE albumId IN (:albumIds)")
    protected abstract suspend fun deleteAlbumArtists(albumIds: List<Long>)

    @Insert
    protected abstract suspend fun insertAlbumArtists(artists: List<AlbumArtistEntity>)

    @Upsert
    protected abstract suspend fun upsertParties(parties: List<PartyEntity>)

    @Query("DELETE FROM library_album")
    protected abstract suspend fun deleteLibraryAlbums()

    @Insert
    protected abstract suspend fun insertLibraryAlbums(albums: List<LibraryAlbumEntity>)

    @Query("DELETE FROM library_party")
    protected abstract suspend fun deleteLibraryParties()

    @Insert
    protected abstract suspend fun insertLibraryParties(parties: List<LibraryPartyEntity>)

    @Query("DELETE FROM language")
    protected abstract suspend fun deleteLanguages()

    @Insert
    protected abstract suspend fun insertLanguages(languages: List<LanguageEntity>)

    @Upsert
    protected abstract suspend fun upsertSync(sync: LibrarySyncEntity)
}

private fun orderBy(sort: ListSort, title: String, createdAt: String): String {
    val byTitle = "$title COLLATE UNICODE"
    return " ORDER BY " + when (sort) {
        ListSort.TitleAsc -> "$byTitle ASC"
        ListSort.TitleDesc -> "$byTitle DESC"
        ListSort.CreatedAtDesc -> "$createdAt DESC, $byTitle ASC"
        ListSort.CreatedAtAsc -> "$createdAt ASC, $byTitle ASC"
    }
}

private class SqlFilter {
    private val conditions = mutableListOf<String>()
    private val args = mutableListOf<Any>()

    fun search(column: String, text: String) {
        val key = searchKey(text)
        if (key.isEmpty()) return
        conditions += "$column LIKE ?"
        args += "%$key%"
    }

    fun anyOf(column: String, values: List<Any>) {
        if (values.isEmpty()) return
        conditions += "$column IN (${values.joinToString(", ") { "?" }})"
        args.addAll(values)
    }

    fun where() = if (conditions.isEmpty()) "" else " WHERE " + conditions.joinToString(" AND ")

    fun toQuery(sql: String) = RoomRawQuery(sql) { statement ->
        args.forEachIndexed { index, arg ->
            when (arg) {
                is Long -> statement.bindLong(index + 1, arg)
                else -> statement.bindText(index + 1, arg.toString())
            }
        }
    }
}
