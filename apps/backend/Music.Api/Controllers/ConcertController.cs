using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("concerts")]
public sealed class ConcertController(IConcertService concertService) : ControllerBase
{
    private readonly IConcertService _concertService = concertService;

    [HttpPost("create")]
    [ProducesResponseType(typeof(CreateConcertUploadResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Create(
        [FromBody] CreateConcertModel request,
        CancellationToken cancellationToken)
    {
        string userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new ValidationException("Missing user identifier claim.");

        CreateConcertUploadResult result = await _concertService.CreateConcertAsync(request, userId, cancellationToken);

        return Ok(result);
    }

    [HttpPost("create-without-upload")]
    [ProducesResponseType(typeof(CreateConcertWithoutUploadResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateWithoutUpload(
        [FromBody] CreateConcertModel request,
        CancellationToken cancellationToken)
    {
        string userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new ValidationException("Missing user identifier claim.");

        CreateConcertWithoutUploadResult result = await _concertService.CreateConcertWithoutUploadAsync(request, userId, cancellationToken);

        return Ok(result);
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ConcertListItemModel>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        IReadOnlyList<ConcertListItemModel> concerts = await _concertService.GetAllAsync(cancellationToken);
        return Ok(concerts);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ConcertDetailsModel), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(
        [FromRoute][Required] int id,
        CancellationToken cancellationToken)
    {
        ConcertDetailsModel concert = await _concertService.GetByIdAsync(id, cancellationToken);
        return Ok(concert);
    }
}
