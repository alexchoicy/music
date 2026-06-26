using System.Xml.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Search;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("search")]
public sealed class SearchController(ISearchService searchService, IConfiguration configuration)
    : ControllerBase
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

    [HttpGet("opensearch")]
    [AllowAnonymous]
    public IActionResult OpenSearch()
    {
        string webUrl = configuration["Base:WebUrl"]!.TrimEnd('/');
        XNamespace ns = "http://a9.com/-/spec/opensearch/1.1/";
        XDocument document = new(
            new XElement(
                ns + "OpenSearchDescription",
                new XElement(ns + "ShortName", "Music"),
                new XElement(ns + "Description", "Search Music"),
                new XElement(ns + "InputEncoding", "UTF-8"),
                new XElement(
                    ns + "Url",
                    new XAttribute("type", "text/html"),
                    new XAttribute("method", "get"),
                    new XAttribute("template", $"{webUrl}/?command={{searchTerms}}")
                )
            )
        );

        return Content(
            document.ToString(SaveOptions.DisableFormatting),
            "application/opensearchdescription+xml"
        );
    }
}
