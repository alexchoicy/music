using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Interfaces;
using Music.Api.Dtos.Requests;
using Microsoft.AspNetCore.Authorization;
using Music.Api.Dtos.Responses;
using Music.Core.Models;
using System.ComponentModel.DataAnnotations;
using Music.Api.Mappers;
using Music.Core.Enums;

namespace Music.Api.Controllers;

[ApiController]
[Route("albums")]
public class AlbumController(IAlbumService albumService) : ControllerBase
{
    private readonly IAlbumService _albumService = albumService;

    [HttpGet("{id:int}/simple")]
    [Authorize(Policy = "BotAllowed")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(AlbumSimpleModel), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSimpleById(
        [FromRoute][Required] int id,
        CancellationToken cancellationToken)
    {
        AlbumSimpleModel album = await _albumService.GetSimpleByIdAsync(id, cancellationToken);
        return Ok(album);
    }

    [HttpGet("{id:int}")]
    [Authorize]
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
    [Authorize]
    [Produces("application/json")]
    [ProducesResponseType(typeof(IReadOnlyList<AlbumListItemModel>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllForList(CancellationToken cancellationToken)
    {
        IReadOnlyList<AlbumListItemModel> list = await _albumService.GetAllForListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}/download")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(IReadOnlyList<AlbumTrackDownloadItemModel>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetDownloadUrls(
        [FromRoute][Required] int id,
        [FromQuery][Required] FileObjectVariant variant,
        CancellationToken cancellationToken)
    {
        if (variant != FileObjectVariant.Original && variant != FileObjectVariant.Opus96)
            throw new ValidationException("Only Original and Opus96 variants are supported for album downloads.");

        IReadOnlyList<AlbumTrackDownloadItemModel> downloadUrls = await _albumService
            .GetAlbumDownloadUrlsAsync(id, variant, cancellationToken);

        return Ok(downloadUrls);
    }

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
