using Microsoft.EntityFrameworkCore;
using Music.Core.Services.Home;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Home;

public class HomeService(AppDbContext dbContext) : IHomeService
{
    public async Task<HomeOverview> GetOverviewAsync(CancellationToken cancellationToken = default)
    {
        int albumCount = await dbContext.Albums.CountAsync(cancellationToken);
        // Party 1 is the reserved Unknown credit used by album creation.
        int artistCount = await dbContext.Parties.CountAsync(
            party => party.Id != 1,
            cancellationToken
        );
        int concertCount = await dbContext.Concerts.CountAsync(cancellationToken);

        return new HomeOverview
        {
            AlbumCount = albumCount,
            ArtistCount = artistCount,
            ConcertCount = concertCount,
        };
    }
}
