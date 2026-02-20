using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Enums;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("tracks")]
public sealed class TrackController(IAlbumService albumService) : ControllerBase
{
    private readonly IAlbumService _albumService = albumService;

    [HttpGet("{id:int}/download")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(AlbumTrackDownloadItemModel), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetDownloadUrl(
        [FromRoute][Required] int id,
        [FromQuery][Required] FileObjectVariant variant,
        CancellationToken cancellationToken)
    {
        if (variant != FileObjectVariant.Original && variant != FileObjectVariant.Opus96)
            throw new ValidationException("Only Original and Opus96 variants are supported for track downloads.");

        AlbumTrackDownloadItemModel downloadUrl = await _albumService
            .GetTrackDownloadUrlAsync(id, variant, cancellationToken);

        return Ok(downloadUrl);
    }
}
