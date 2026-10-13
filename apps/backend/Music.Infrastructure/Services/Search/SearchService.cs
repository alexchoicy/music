using Music.Core.Services.Albums;
using Music.Core.Services.Concerts;
using Music.Core.Services.Parties;
using Music.Core.Services.Search;

namespace Music.Infrastructure.Services.Search;

public sealed class SearchService(
    IAlbumService albumService,
    IConcertService concertService,
    IPartyService partyService
) : ISearchService
{
    public async Task<SearchResult> SearchAsync(
        SearchRequest request,
        CancellationToken cancellationToken = default
    )
    {
        string query = request.Query?.Trim() ?? string.Empty;
        int limit = Math.Max(request.Limit, 0);

        // The services share one DbContext, so these run one after another.
        AlbumListRequest albumRequest = new() { Search = query, Limit = limit };
        IReadOnlyList<AlbumListItem> albums = await albumService.GetAllForListAsync(
            albumRequest,
            cancellationToken
        );
        int albumTotal = await CountAsync(
            albums.Count,
            limit,
            () => albumService.CountForListAsync(albumRequest, cancellationToken)
        );

        ConcertListRequest concertRequest = new() { Search = query, Limit = limit };
        IReadOnlyList<ConcertListItem> concerts = await concertService.GetAllAsync(
            concertRequest,
            cancellationToken
        );
        int concertTotal = await CountAsync(
            concerts.Count,
            limit,
            () => concertService.CountAsync(concertRequest, cancellationToken)
        );

        PartyListRequest partyRequest = new() { Search = query, Limit = limit };
        IList<PartyItems> parties = await partyService.GetAllAsync(partyRequest, cancellationToken);
        int partyTotal = await CountAsync(
            parties.Count,
            limit,
            () => partyService.CountAsync(partyRequest, cancellationToken)
        );

        return new SearchResult
        {
            Albums = albums,
            Concerts = concerts,
            Parties = parties.ToList(),
            AlbumTotal = albumTotal,
            ConcertTotal = concertTotal,
            PartyTotal = partyTotal,
        };
    }

    private static async Task<int> CountAsync(int loaded, int limit, Func<Task<int>> count)
    {
        return limit > 0 && loaded >= limit ? await count() : loaded;
    }
}
