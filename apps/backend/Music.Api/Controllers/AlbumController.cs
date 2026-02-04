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
[Route("albums")]
public class AlbumController(IAlbumService albumService) : ControllerBase
{
    private readonly IAlbumService _albumService = albumService;

    [HttpPost]
    [Authorize]
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
