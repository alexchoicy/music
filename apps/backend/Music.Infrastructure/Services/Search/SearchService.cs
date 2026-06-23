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

        IReadOnlyList<AlbumListItem> albums = await albumService.GetAllForListAsync(
            new AlbumListRequest { Search = query },
            cancellationToken
        );
        IReadOnlyList<ConcertListItem> concerts = await concertService.GetAllAsync(
            new ConcertListRequest { Search = query },
            cancellationToken
        );
        IList<PartyItems> parties = await partyService.GetAllAsync(
            new PartyListRequest { Search = query },
            cancellationToken
        );

        return new SearchResult
        {
            Albums = albums,
            Concerts = concerts,
            Parties = parties.ToList(),
        };
    }
}
