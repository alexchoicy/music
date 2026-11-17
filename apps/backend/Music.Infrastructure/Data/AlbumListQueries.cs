using Microsoft.EntityFrameworkCore;
using Music.Core.Entities;
using Music.Core.Services.Albums;
using Music.Core.Storage;
using Music.Infrastructure.Mappers;

namespace Music.Infrastructure.Data;

internal static class AlbumListQueries
{
    public static async Task<List<AlbumListItem>> LoadAlbumListItemsAsync(
        this AppDbContext dbContext,
        IQueryable<Album> albumQuery,
        IAssetsService assetsService,
        CancellationToken cancellationToken,
        IQueryable<Track>? matchedTracks = null
    )
    {
        List<Album> albums = await albumQuery
            .AsNoTracking()
            .AsSplitQuery()
            .Include(album => album.Credits)
                .ThenInclude(credit => credit.Party)
            .Include(album => album.Discs)
            .Include(album => album.Images)
                .ThenInclude(image => image.File)
                    .ThenInclude(file => file!.FileObjects)
            .ToListAsync(cancellationToken);

        if (albums.Count == 0)
            return [];

        int[] albumIds = albums.Select(album => album.Id).ToArray();

        // Explicit joins: grouping through navigations makes EF emit a correlated subquery per sum.
        var totals = await (
            from albumTrack in dbContext.AlbumTracks.AsNoTracking()
            join disc in dbContext.AlbumDiscs on albumTrack.AlbumDiscId equals disc.Id
            join track in dbContext.Tracks on albumTrack.TrackId equals track.Id
            where albumIds.Contains(disc.AlbumId)
            group track.DurationInMs by disc.AlbumId into durations
            select new
            {
                AlbumId = durations.Key,
                TrackCount = durations.Count(),
                TotalDurationInMs = durations.Sum(),
            }
        ).ToDictionaryAsync(total => total.AlbumId, cancellationToken);

        ILookup<int, AlbumListMatchedTrack>? matchedTracksByAlbumId = null;
        if (matchedTracks is not null)
        {
            var matches = await matchedTracks
                .SelectMany(
                    track => track.AlbumTracks,
                    (track, albumTrack) => new { track, albumTrack }
                )
                .Where(match => albumIds.Contains(match.albumTrack.AlbumDisc!.AlbumId))
                .OrderBy(match => match.albumTrack.AlbumDisc!.DiscNumber)
                .ThenBy(match => match.albumTrack.TrackNumber)
                .Select(match => new
                {
                    match.albumTrack.AlbumDisc!.AlbumId,
                    Track = new AlbumListMatchedTrack
                    {
                        TrackId = match.track.Id,
                        DiscNumber = match.albumTrack.AlbumDisc.DiscNumber,
                        TrackNumber = match.albumTrack.TrackNumber,
                        Title = match.track.Title,
                        BasedOnTrackId = match.track.BasedOnTrackId,
                        BasedOnTrackTitle = match.track.BasedOnTrack!.Title,
                    },
                })
                .ToListAsync(cancellationToken);

            matchedTracksByAlbumId = matches.ToLookup(match => match.AlbumId, match => match.Track);
        }

        return albums
            .Select(album =>
            {
                totals.TryGetValue(album.Id, out var total);
                return album.ToListItem(
                    assetsService,
                    total?.TrackCount ?? 0,
                    total?.TotalDurationInMs ?? 0,
                    matchedTracksByAlbumId?[album.Id].ToList() ?? []
                );
            })
            .ToList();
    }
}
