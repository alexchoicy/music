using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Common.Constants;
using Music.Core.Services.Auth;
using Music.Core.Services.Files;

namespace Music.Api.Controllers;

[ApiController]
[Route("files")]
public class FileController(IFileUrlService fileUrlService) : ControllerBase
{
    [HttpGet("{id:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUrl(
        [FromRoute] [Required] Guid id,
        CancellationToken cancellationToken
    )
    {
        string url = await fileUrlService.GetFilePlayUrlAsync(id, cancellationToken);
        return Ok(url);
    }

    [HttpGet("{id:guid}/manifest.mpd")]
    [Authorize]
    [Produces("application/dash+xml")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetManifest(
        [FromRoute] [Required] Guid id,
        CancellationToken cancellationToken
    )
    {
        string manifest = await fileUrlService.GetDashManifestAsync(id, cancellationToken);
        return Content(manifest, "application/dash+xml");
    }
}
