using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Interfaces;
using Music.Api.Dtos.Requests;
using Microsoft.AspNetCore.Authorization;
using Music.Api.Dtos.Responses;
using Music.Core.Models;
using System.ComponentModel.DataAnnotations;
using Music.Api.Mappers;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("albums")]
public class AlbumController(IAlbumService albumService) : ControllerBase
{
    private readonly IAlbumService _albumService = albumService;

    [HttpGet("{id:int}")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(AlbumDetailsModel), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(
        [FromRoute][Required] int id,
        CancellationToken cancellationToken)
    {
        AlbumDetailsModel album = await _albumService.GetByIdAsync(id, cancellationToken);
        return Ok(album);
    }

    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(typeof(IReadOnlyList<AlbumListItemModel>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllForList(CancellationToken cancellationToken)
    {
        IReadOnlyList<AlbumListItemModel> list = await _albumService.GetAllForListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpPost]
    [ProducesResponseType(typeof(IReadOnlyList<CreateAlbumResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(IReadOnlyList<CreateAlbumResult>), StatusCodes.Status207MultiStatus)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Create(
        [FromBody] IReadOnlyList<CreateAlbumRequest> request,
        CancellationToken cancellationToken)
    {
        List<CreateAlbumModel> model = request.Select(r => r.ToModel()).ToList();

        string userId = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value!;

        IReadOnlyList<CreateAlbumResult> results = await _albumService.CreateAlbumAsync(model, userId, cancellationToken);

        if (results.All(r => r.IsSuccess))
            return Ok(results);

        if (results.All(r => !r.IsSuccess))
            return BadRequest(results);

        return StatusCode(StatusCodes.Status207MultiStatus, results);
    }

}
