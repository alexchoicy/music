using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Music.Core.Common.Exceptions;
using Music.Core.Entities;
using Music.Core.Services.Playlists;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Playlists;

public sealed class PlaylistService(AppDbContext dbContext) : IPlaylistService
{
    public async Task<IReadOnlyList<PlaylistListItem>> GetAllAsync(
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        return await dbContext
            .Playlists.AsNoTracking()
            .Where(playlist => playlist.OwnerUserId == userId)
            .OrderByDescending(playlist => playlist.UpdatedAt)
            .ThenBy(playlist => playlist.Id)
            .Select(playlist => new PlaylistListItem
            {
                PlaylistId = playlist.Id,
                Name = playlist.Name,
                Version = playlist.Version,
                CreatedAt = playlist.CreatedAt,
                UpdatedAt = playlist.UpdatedAt,
                TrackCount = playlist.Entries.Count,
                TotalDurationInMs = playlist.Entries.Sum(entry =>
                    (long)entry.AlbumTrack!.Track!.DurationInMs
                ),
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<PlaylistDetails> GetByIdAsync(
        int playlistId,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        var playlist = await dbContext
            .Playlists.AsNoTracking()
            .Where(playlist => playlist.Id == playlistId && playlist.OwnerUserId == userId)
            .Select(playlist => new PlaylistDetails
            {
                PlaylistId = playlist.Id,
                Name = playlist.Name,
                Version = playlist.Version,
                Entries = playlist
                    .Entries.OrderBy(entry => entry.Position)
                    .ThenBy(entry => entry.Id)
                    .Select(entry => new PlaylistEntryDetails
                    {
                        EntryId = entry.Id,
                        AlbumId = entry.AlbumTrack!.AlbumDisc!.AlbumId,
                        AlbumTitle = entry.AlbumTrack.AlbumDisc.Album!.Title,
                        AlbumDiscId = entry.AlbumTrack.AlbumDiscId,
                        TrackId = entry.AlbumTrack.TrackId,
                        Title = entry.AlbumTrack.Track!.Title,
                        DurationInMs = entry.AlbumTrack.Track.DurationInMs,
                    })
                    .ToList(),
            })
            .SingleOrDefaultAsync(cancellationToken);
        return playlist ?? throw new EntityNotFoundException("Playlist not found.");
    }

    public async Task<PlaylistDetails> CreateAsync(
        CreatePlaylistRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        var playlist = new Playlist { Name = ValidateName(request.Name), OwnerUserId = userId };
        dbContext.Playlists.Add(playlist);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new PlaylistDetails
        {
            PlaylistId = playlist.Id,
            Name = playlist.Name,
            Version = playlist.Version,
            Entries = [],
        };
    }

    public async Task RenameAsync(
        int playlistId,
        RenamePlaylistRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        string name = ValidateName(request.Name);
        var playlist = await GetOwnedAsync(playlistId, request.Version, userId, cancellationToken);
        playlist.Name = name;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(
        int playlistId,
        uint version,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        var playlist = await GetOwnedAsync(playlistId, version, userId, cancellationToken);
        dbContext.Playlists.Remove(playlist);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddEntriesAsync(
        int playlistId,
        AddPlaylistEntriesRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        Validator.ValidateObject(request, new ValidationContext(request), true);
        foreach (var track in request.Tracks)
        {
            if (track is null)
                throw new ValidationException("Track entries cannot be null.");
            Validator.ValidateObject(track, new ValidationContext(track), true);
        }

        var playlist = await GetOwnedAsync(playlistId, request.Version, userId, cancellationToken);
        var discIds = request.Tracks.Select(track => track.AlbumDiscId).Distinct().ToArray();
        var trackIds = request.Tracks.Select(track => track.TrackId).Distinct().ToArray();
        var albumTracks = await dbContext
            .AlbumTracks.AsNoTracking()
            .Where(track => discIds.Contains(track.AlbumDiscId) && trackIds.Contains(track.TrackId))
            .Select(track => new
            {
                track.Id,
                track.AlbumDiscId,
                track.TrackId,
            })
            .ToDictionaryAsync(track => (track.AlbumDiscId, track.TrackId), cancellationToken);
        var existing = playlist.Entries.Select(entry => entry.AlbumTrackId).ToHashSet();
        var additions = new List<PlaylistEntry>();
        int position =
            playlist.Entries.Count == 0 ? 0 : playlist.Entries.Max(entry => entry.Position) + 1;
        foreach (var track in request.Tracks)
        {
            if (!albumTracks.TryGetValue((track.AlbumDiscId, track.TrackId), out var albumTrack))
                throw new ValidationException(
                    "A selected track does not belong to the selected album disc."
                );
            if (existing.Add(albumTrack.Id))
                additions.Add(
                    new PlaylistEntry { AlbumTrackId = albumTrack.Id, Position = position++ }
                );
        }

        if (additions.Count == 0)
            return;
        await SaveEntryChangesAsync(
            playlist,
            () =>
            {
                foreach (var entry in additions)
                    playlist.Entries.Add(entry);
            },
            cancellationToken
        );
    }

    public async Task RemoveEntryAsync(
        int playlistId,
        int entryId,
        uint version,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        var playlist = await GetOwnedAsync(playlistId, version, userId, cancellationToken);
        var entry =
            playlist.Entries.SingleOrDefault(entry => entry.Id == entryId)
            ?? throw new EntityNotFoundException("Playlist entry not found.");
        await SaveEntryChangesAsync(
            playlist,
            () => dbContext.PlaylistEntries.Remove(entry),
            cancellationToken
        );
    }

    public async Task ReorderEntriesAsync(
        int playlistId,
        ReorderPlaylistEntriesRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        Validator.ValidateObject(request, new ValidationContext(request), true);
        var playlist = await GetOwnedAsync(playlistId, request.Version, userId, cancellationToken);
        var entries = playlist.Entries.ToDictionary(entry => entry.Id);
        if (
            request.EntryIds.Count != entries.Count
            || request.EntryIds.Distinct().Count() != entries.Count
            || request.EntryIds.Any(id => !entries.ContainsKey(id))
        )
            throw new ValidationException(
                "The order must contain every playlist entry exactly once."
            );

        await SaveEntryChangesAsync(
            playlist,
            () =>
            {
                for (int position = 0; position < request.EntryIds.Count; position++)
                    entries[request.EntryIds[position]].Position = position;
            },
            cancellationToken
        );
    }

    private async Task<Playlist> GetOwnedAsync(
        int playlistId,
        uint version,
        string userId,
        CancellationToken cancellationToken
    )
    {
        var playlist =
            await dbContext
                .Playlists.Include(playlist => playlist.Entries)
                .SingleOrDefaultAsync(
                    playlist => playlist.Id == playlistId && playlist.OwnerUserId == userId,
                    cancellationToken
                )
            ?? throw new EntityNotFoundException("Playlist not found.");
        if (playlist.Version != version)
            throw new ConflictException("This playlist changed. Reload it and try again.");
        return playlist;
    }

    private async Task SaveEntryChangesAsync(
        Playlist playlist,
        Action changeEntries,
        CancellationToken cancellationToken
    )
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            cancellationToken
        );
        // Update the parent's concurrency token before writing entries so competing edits cannot overwrite each other.
        playlist.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        changeEntries();
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    private static string ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 200)
            throw new ValidationException("Playlist name must contain 1 to 200 characters.");
        return name.Trim();
    }
}
