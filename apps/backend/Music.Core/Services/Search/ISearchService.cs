using Music.Core.Services.Albums;
using Music.Core.Services.Concerts;
using Music.Core.Services.Parties;

namespace Music.Core.Services.Search;

public interface ISearchService
{
    Task<SearchResult> SearchAsync(SearchRequest request, CancellationToken cancellationToken = default);
}

public sealed class SearchRequest
{
    public string? Query { get; init; }
}

public sealed class SearchResult
{
    public required IReadOnlyList<AlbumListItem> Albums { get; init; }
    public required IReadOnlyList<ConcertListItem> Concerts { get; init; }
    public required IReadOnlyList<PartyItems> Parties { get; init; }
}
