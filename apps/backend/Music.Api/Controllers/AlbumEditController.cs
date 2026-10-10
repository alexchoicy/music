using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Common.Constants;
using Music.Core.Services.Albums;
using Music.Core.Services.Albums.Requests;
using Music.Core.Services.Albums.Results;

namespace Music.Api.Controllers;

[ApiController]
[Route("albums/{id:int}")]
[Authorize]
[Authorize(AuthorizationPolicies.RequireUploaderRole)]
public sealed class AlbumEditController(IAlbumEditService albumEditService) : ControllerBase
{
    private readonly IAlbumEditService _albumEditService = albumEditService;

    [HttpGet("edit")]
    [ProducesResponseType(typeof(AlbumEditDetails), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        [FromRoute] [Required] int id,
        CancellationToken cancellationToken
    )
    {
        AlbumEditDetails album = await _albumEditService.GetAsync(id, cancellationToken);
        return Ok(album);
    }

    [HttpPatch]
    [ProducesResponseType(typeof(AlbumEditDetails), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateDetails(
        [FromRoute] [Required] int id,
        [FromBody] UpdateAlbumDetailsRequest request,
        CancellationToken cancellationToken
    )
    {
        AlbumEditDetails album = await _albumEditService.UpdateDetailsAsync(
            id,
            request,
            cancellationToken
        );
        return Ok(album);
    }

    [HttpPut("cover")]
    [ProducesResponseType(typeof(UpdateAlbumCoverResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCover(
        [FromRoute] [Required] int id,
        [FromBody] UpdateAlbumCoverRequest request,
        CancellationToken cancellationToken
    )
    {
        string userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new ValidationException("Missing user identifier claim.");

        UpdateAlbumCoverResult result = await _albumEditService.UpdateCoverAsync(
            id,
            request,
            userId,
            cancellationToken
        );
        return Ok(result);
    }

    [HttpPut("tracks")]
    [ProducesResponseType(typeof(AlbumEditDetails), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateTracks(
        [FromRoute] [Required] int id,
        [FromBody] UpdateAlbumTracksRequest request,
        CancellationToken cancellationToken
    )
    {
        AlbumEditDetails album = await _albumEditService.UpdateTracksAsync(
            id,
            request,
            cancellationToken
        );
        return Ok(album);
    }
}
