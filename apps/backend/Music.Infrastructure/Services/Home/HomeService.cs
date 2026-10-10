using Microsoft.EntityFrameworkCore;
using Music.Core.Common.Enums;
using Music.Core.Services.Albums;
using Music.Core.Services.Concerts;
using Music.Core.Services.Home;
using Music.Core.Services.Parties;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Home;

public class HomeService(
    AppDbContext dbContext,
    IAlbumService albumService,
    IPartyService partyService,
    IConcertService concertService
) : IHomeService
{
    private const int SectionLimit = 10;

    public async Task<HomeFeed> GetFeedAsync(
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        var resumePoints = await dbContext
            .PlaybackResumePoints.AsNoTracking()
            .Where(point => point.UserId == userId)
            .OrderByDescending(point => point.UpdatedAt)
            .Take(SectionLimit)
            .Select(point => new
            {
                point.DeviceId,
                point.DeviceName,
                point.PositionMs,
                point.UpdatedAt,
                point.AlbumTrack!.AlbumDisc!.AlbumId,
                point.AlbumTrack.TrackId,
                point.AlbumTrack.Track!.Title,
                point.AlbumTrack.Track.DurationInMs,
            })
            .ToListAsync(cancellationToken);

        List<int> recentlyPlayedAlbumIds = await dbContext
            .ListeningHistoryEntries.AsNoTracking()
            .Where(entry => entry.UserId == userId)
            .GroupBy(entry => entry.AlbumTrack!.AlbumDisc!.AlbumId)
            .Select(group => new
            {
                AlbumId = group.Key,
                LastEntryId = group.Max(entry => entry.Id),
            })
            .OrderByDescending(item => item.LastEntryId)
            .Take(SectionLimit)
            .Select(item => item.AlbumId)
            .ToListAsync(cancellationToken);

        Dictionary<int, AlbumListItem> albumsById = (
            await albumService.GetListItemsByIdsAsync(
                [.. resumePoints.Select(point => point.AlbumId), .. recentlyPlayedAlbumIds],
                cancellationToken
            )
        ).ToDictionary(album => album.AlbumId);

        IReadOnlyList<AlbumListItem> recentAlbums = await albumService.GetAllForListAsync(
            new AlbumListRequest { Sort = ListSortOption.CreatedAtDesc, Limit = SectionLimit },
            cancellationToken
        );
        IList<PartyItems> recentParties = await partyService.GetAllAsync(
            new PartyListRequest
            {
                ExcludeNoAlbums = true,
                Sort = ListSortOption.CreatedAtDesc,
                Limit = SectionLimit,
            },
            cancellationToken
        );
        IReadOnlyList<ConcertListItem> recentConcerts = await concertService.GetAllAsync(
            new ConcertListRequest { Sort = ListSortOption.CreatedAtDesc, Limit = SectionLimit },
            cancellationToken
        );

        return new HomeFeed
        {
            ContinueListening =
            [
                .. resumePoints
                    .Where(point => albumsById.ContainsKey(point.AlbumId))
                    .Select(point => new ContinueListeningItem
                    {
                        DeviceId = point.DeviceId,
                        DeviceName = point.DeviceName,
                        TrackId = point.TrackId,
                        TrackTitle = point.Title,
                        DurationInMs = point.DurationInMs,
                        PositionMs = Math.Min(point.PositionMs, point.DurationInMs),
                        UpdatedAt = point.UpdatedAt,
                        Album = albumsById[point.AlbumId],
                    }),
            ],
            RecentlyPlayed =
            [
                .. recentlyPlayedAlbumIds
                    .Where(albumsById.ContainsKey)
                    .Select(albumId => albumsById[albumId]),
            ],
            RecentAlbums = recentAlbums,
            RecentParties = [.. recentParties],
            RecentConcerts = recentConcerts,
        };
    }
}
