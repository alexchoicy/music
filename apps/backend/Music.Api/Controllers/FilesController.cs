using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Interfaces;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("files")]
public sealed class FilesController(IFileUrlService fileUrlService) : ControllerBase
{
    private readonly IFileUrlService _fileUrlService = fileUrlService;

    // [HttpGet("{id:guid}")]
    // [Produces("application/json")]
    // [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    // public async Task<IActionResult> GetUrl(
    //     [FromRoute][Required] Guid id,
    //     CancellationToken cancellationToken)
    // {
    //     string url = await _fileUrlService.GetFileUrlAsync(id, cancellationToken);
    //     return Ok(url);
    // }

    [HttpGet("{id:guid}/play")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> Play(
        [FromRoute][Required] Guid id,
        CancellationToken cancellationToken)
    {
        string url = await _fileUrlService.GetFilePlayUrlAsync(id, cancellationToken);
        return Redirect(url);
    }
}
