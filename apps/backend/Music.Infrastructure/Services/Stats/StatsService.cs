using Microsoft.EntityFrameworkCore;
using Music.Core.Services.Stats;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Stats;

public class StatsService(AppDbContext dbContext) : IStatsService
{
    public async Task<LibraryStats> GetLibraryStatsAsync(
        CancellationToken cancellationToken = default
    )
    {
        int albumCount = await dbContext.Albums.CountAsync(cancellationToken);
        int artistCount = await dbContext.Parties.CountAsync(
            party => party.Id != 1,
            cancellationToken
        );
        int concertCount = await dbContext.Concerts.CountAsync(cancellationToken);

        return new LibraryStats
        {
            AlbumCount = albumCount,
            ArtistCount = artistCount,
            ConcertCount = concertCount,
        };
    }
}
