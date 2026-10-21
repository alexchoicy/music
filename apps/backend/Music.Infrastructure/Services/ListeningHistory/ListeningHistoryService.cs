using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Music.Core.Common.Exceptions;
using Music.Core.Entities;
using Music.Core.Services.ListeningHistory;
using Music.Core.Storage;
using Music.Infrastructure.Data;
using Music.Infrastructure.Mappers;

namespace Music.Infrastructure.Services.ListeningHistory;

public sealed class ListeningHistoryService(
    AppDbContext dbContext,
    IAssetsService assetsService,
    IContentService contentService
) : IListeningHistoryService
{
    private const int MaxCountedTracks = 100;

    public async Task<ListeningHistoryPage> GetPageAsync(
        ListeningHistoryPageRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        Validator.ValidateObject(request, new ValidationContext(request), true);
        var query = dbContext
            .ListeningHistoryEntries.AsNoTracking()
            .Where(entry => entry.UserId == userId);
        if (request.Before is long before)
            query = query.Where(entry => entry.Id < before);

        var entries = await query
            .OrderByDescending(entry => entry.Id)
            .Take(request.Limit + 1)
            .Select(entry => new
            {
                entry.Id,
                entry.PlayedAt,
                entry.AlbumTrackId,
            })
            .ToListAsync(cancellationToken);

        bool hasMore = entries.Count > request.Limit;
        if (hasMore)
            entries.RemoveAt(entries.Count - 1);
        var albumTracks = await dbContext.LoadPlayableAlbumTracksAsync(
            entries.Select(entry => entry.AlbumTrackId),
            cancellationToken
        );
        return new ListeningHistoryPage
        {
            Entries = entries
                .Where(entry => albumTracks.ContainsKey(entry.AlbumTrackId))
                .Select(entry =>
                {
                    var albumTrack = albumTracks[entry.AlbumTrackId];
                    var album = albumTrack.AlbumDisc!.Album!;
                    var track = albumTrack.Track!;
                    return new ListeningHistoryEntryDetails
                    {
                        EntryId = entry.Id,
                        PlayedAt = entry.PlayedAt,
                        AlbumId = album.Id,
                        AlbumTitle = album.Title,
                        AlbumLanguageId = album.LanguageId,
                        AlbumDiscId = albumTrack.AlbumDiscId,
                        TrackId = track.Id,
                        Title = track.Title,
                        LanguageId = track.LanguageId,
                        DurationInMs = track.DurationInMs,
                        ContentType = track.ContentType,
                        VersionType = track.VersionType,
                        Cover = album.ToDiscCoverVariants(albumTrack.AlbumDiscId, assetsService),
                        Credits = track.ToPartyCredits(assetsService),
                        Audios = track.ToAudioDetails(contentService, assetsService),
                    };
                })
                .ToList(),
            NextCursor = hasMore ? entries[^1].Id : null,
        };
    }

    public async Task RecordAsync(
        RecordListeningHistoryRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        Validator.ValidateObject(request, new ValidationContext(request), true);
        int albumTrackId =
            await FindAlbumTrackIdAsync(request.AlbumId, request.TrackId, cancellationToken)
            ?? throw new EntityNotFoundException("Album track not found.");

        dbContext.ListeningHistoryEntries.Add(
            new ListeningHistoryEntry { UserId = userId, AlbumTrackId = albumTrackId }
        );
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task SaveResumePointAsync(
        SaveResumePointRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        // Devices report tracks that may have been deleted since; there is nothing to resume then.
        if (
            await FindAlbumTrackIdAsync(request.AlbumId, request.TrackId, cancellationToken)
            is not int albumTrackId
        )
        {
            return;
        }

        DateTimeOffset observedAt = request.ObservedAt;
        long positionMs = Math.Max(0, request.PositionMs);
        Task<int> UpdateAsync() =>
            dbContext
                .PlaybackResumePoints.Where(point =>
                    point.UserId == userId
                    && point.DeviceId == request.DeviceId
                    && point.UpdatedAt <= observedAt
                )
                .ExecuteUpdateAsync(
                    setters =>
                        setters
                            .SetProperty(point => point.DeviceName, request.DeviceName)
                            .SetProperty(point => point.AlbumTrackId, albumTrackId)
                            .SetProperty(point => point.PositionMs, positionMs)
                            .SetProperty(point => point.UpdatedAt, observedAt),
                    cancellationToken
                );

        if (
            await UpdateAsync() > 0
            || await dbContext.PlaybackResumePoints.AnyAsync(
                point => point.UserId == userId && point.DeviceId == request.DeviceId,
                cancellationToken
            )
        )
            return;

        PlaybackResumePoint point = new()
        {
            UserId = userId,
            DeviceId = request.DeviceId,
            DeviceName = request.DeviceName,
            AlbumTrackId = albumTrackId,
            PositionMs = positionMs,
            UpdatedAt = observedAt,
        };
        dbContext.PlaybackResumePoints.Add(point);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Another tab of the same device inserted the row first.
            dbContext.Entry(point).State = EntityState.Detached;
            await UpdateAsync();
        }
    }

    public Task ClearResumePointAsync(
        Guid deviceId,
        string userId,
        CancellationToken cancellationToken = default
    ) =>
        dbContext
            .PlaybackResumePoints.Where(point =>
                point.UserId == userId && point.DeviceId == deviceId
            )
            .ExecuteDeleteAsync(cancellationToken);

    private Task<int?> FindAlbumTrackIdAsync(
        int albumId,
        int trackId,
        CancellationToken cancellationToken
    ) =>
        dbContext
            .AlbumTracks.AsNoTracking()
            .Where(track => track.TrackId == trackId && track.AlbumDisc!.AlbumId == albumId)
            .OrderBy(track => track.AlbumDisc!.DiscNumber)
            .ThenBy(track => track.TrackNumber)
            .Select(track => (int?)track.Id)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task DeleteEntryAsync(
        long entryId,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        int deleted = await dbContext
            .ListeningHistoryEntries.Where(entry => entry.Id == entryId && entry.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);
        if (deleted == 0)
            throw new EntityNotFoundException("Listening history entry not found.");
    }

    public async Task<ListeningHistoryCounts> GetCountsAsync(
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        var userEntries = dbContext
            .ListeningHistoryEntries.AsNoTracking()
            .Where(entry => entry.UserId == userId);
        int totalPlays = await userEntries.CountAsync(cancellationToken);
        int trackCount = await userEntries
            .Select(entry => entry.AlbumTrackId)
            .Distinct()
            .CountAsync(cancellationToken);

        var counts = await userEntries
            .GroupBy(entry => entry.AlbumTrackId)
            .Select(group => new
            {
                AlbumTrackId = group.Key,
                PlayCount = group.Count(),
                LastPlayedAt = group.Max(entry => entry.PlayedAt),
            })
            .OrderByDescending(item => item.PlayCount)
            .ThenByDescending(item => item.LastPlayedAt)
            .Take(MaxCountedTracks)
            .ToListAsync(cancellationToken);

        var albumTracks = await dbContext.LoadPlayableAlbumTracksAsync(
            counts.Select(item => item.AlbumTrackId),
            cancellationToken
        );

        return new ListeningHistoryCounts
        {
            TotalPlays = totalPlays,
            TrackCount = trackCount,
            Tracks = counts
                .Where(item => albumTracks.ContainsKey(item.AlbumTrackId))
                .Select(item =>
                {
                    var albumTrack = albumTracks[item.AlbumTrackId];
                    var album = albumTrack.AlbumDisc!.Album!;
                    var track = albumTrack.Track!;
                    return new ListeningHistoryTrackCount
                    {
                        AlbumId = album.Id,
                        AlbumTitle = album.Title,
                        AlbumLanguageId = album.LanguageId,
                        AlbumDiscId = albumTrack.AlbumDiscId,
                        TrackId = track.Id,
                        Title = track.Title,
                        LanguageId = track.LanguageId,
                        DurationInMs = track.DurationInMs,
                        ContentType = track.ContentType,
                        VersionType = track.VersionType,
                        Cover = album.ToDiscCoverVariants(albumTrack.AlbumDiscId, assetsService),
                        Credits = track.ToPartyCredits(assetsService),
                        Audios = track.ToAudioDetails(contentService, assetsService),
                        PlayCount = item.PlayCount,
                        LastPlayedAt = item.LastPlayedAt,
                    };
                })
                .ToList(),
        };
    }
}
