using Microsoft.EntityFrameworkCore;
using Music.Core.Entities;

namespace Music.Infrastructure.Data;

internal static class AlbumTrackQueries
{
    public static Task<Dictionary<int, AlbumTrack>> LoadPlayableAlbumTracksAsync(
        this AppDbContext dbContext,
        IEnumerable<int> albumTrackIds,
        CancellationToken cancellationToken
    )
    {
        int[] ids = albumTrackIds.Distinct().ToArray();
        return dbContext
            .AlbumTracks.AsNoTracking()
            .AsSplitQuery()
            .Where(albumTrack => ids.Contains(albumTrack.Id))
            .Include(albumTrack => albumTrack.AlbumDisc!)
                .ThenInclude(disc => disc.Album!)
                    .ThenInclude(album => album.Images)
                        .ThenInclude(image => image.File)
                            .ThenInclude(file => file!.FileObjects)
            .Include(albumTrack => albumTrack.Track!)
                .ThenInclude(track => track.Credits)
                    .ThenInclude(credit => credit.Party)
                        .ThenInclude(party => party!.Images)
                            .ThenInclude(image => image.File)
                                .ThenInclude(file => file!.FileObjects)
            .Include(albumTrack => albumTrack.Track!)
                .ThenInclude(track => track.Audios)
                    .ThenInclude(audio => audio.File!)
                        .ThenInclude(file => file.FileObjects)
            .ToDictionaryAsync(albumTrack => albumTrack.Id, cancellationToken);
    }
}
