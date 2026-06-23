using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Search;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("search")]
public sealed class SearchController(ISearchService searchService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(SearchResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search(
        [FromQuery] SearchRequest request,
        CancellationToken cancellationToken
    )
    {
        SearchResult result = await searchService.SearchAsync(request, cancellationToken);
        return Ok(result);
    }
}
