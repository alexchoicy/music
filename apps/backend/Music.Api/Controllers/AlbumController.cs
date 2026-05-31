using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Domain.Albums;
using Music.Core.Shared.Constants;

namespace Music.Api.Controllers;

[ApiController]
[Route("albums")]
public class AlbumController(IAlbumService albumService) : ControllerBase
{
    private readonly IAlbumService _albumService = albumService;

    [HttpGet("{id:int}/summary")]
    [Authorize(Policy = AuthorizationPolicies.BotAllowed)]
    [Produces("application/json")]
    [ProducesResponseType(typeof(AlbumSummary), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSimpleById(
        [FromRoute] [Required] int id,
        CancellationToken cancellationToken
    )
    {
        AlbumSummary album = await _albumService.GetSummaryByIdAsync(id, cancellationToken);
        return Ok(album);
    }

    [HttpGet]
    [Authorize]
    [Produces("application/json")]
    [ProducesResponseType(typeof(IReadOnlyList<AlbumListItem>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllForList(CancellationToken cancellationToken)
    {
        IReadOnlyList<AlbumListItem> list = await _albumService.GetAllForListAsync(
            cancellationToken
        );
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    [Authorize]
    [Produces("application/json")]
    [ProducesResponseType(typeof(AlbumDetails), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(
        [FromRoute] [Required] int id,
        CancellationToken cancellationToken
    )
    {
        AlbumDetails album = await _albumService.GetByIdAsync(id, cancellationToken);
        return Ok(album);
    }

    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(IReadOnlyList<CreateAlbumResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(
        typeof(IReadOnlyList<CreateAlbumResult>),
        StatusCodes.Status207MultiStatus
    )]
    [ProducesResponseType(
        typeof(IReadOnlyList<CreateAlbumResult>),
        StatusCodes.Status400BadRequest
    )]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Create(
        [FromBody] [Required] IReadOnlyList<CreateAlbumRequest> request,
        CancellationToken cancellationToken
    )
    {
        if (request.Count == 0)
            return BadRequest("At least one album is required.");

        string userId =
            User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? throw new ValidationException("Missing user identifier claim.");

        IReadOnlyList<CreateAlbumResult> results = await _albumService.CreateAlbumAsync(
            request,
            userId,
            cancellationToken
        );

        if (results.All(r => r.IsSuccess))
            return Ok(results);

        if (results.All(r => !r.IsSuccess))
            return BadRequest(results);

        return StatusCode(StatusCodes.Status207MultiStatus, results);
    }
}
