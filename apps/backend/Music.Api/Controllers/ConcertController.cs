using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Concerts;
using Music.Core.Services.Concerts.Requests;
using Music.Core.Services.Concerts.Results;

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
        [FromBody] CreateConcertRequest request,
        CancellationToken cancellationToken
    )
    {
        string userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new ValidationException("Missing user identifier claim.");

        CreateConcertUploadResult result = await _concertService.CreateConcertAsync(
            request,
            userId,
            cancellationToken
        );

        return Ok(result);
    }

    [HttpPost("create-without-upload")]
    [ProducesResponseType(typeof(CreateConcertWithoutUploadResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateWithoutUpload(
        [FromBody] CreateConcertRequest request,
        CancellationToken cancellationToken
    )
    {
        string userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new ValidationException("Missing user identifier claim.");

        CreateConcertWithoutUploadResult result =
            await _concertService.CreateConcertWithoutUploadAsync(
                request,
                userId,
                cancellationToken
            );

        return Ok(result);
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ConcertListItem>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] ConcertListRequest concertListRequest,
        CancellationToken cancellationToken
    )
    {
        IReadOnlyList<ConcertListItem> concerts = await _concertService.GetAllAsync(
            concertListRequest,
            cancellationToken
        );
        return Ok(concerts);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ConcertDetails), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(
        [FromRoute] [Required] int id,
        CancellationToken cancellationToken
    )
    {
        ConcertDetails concert = await _concertService.GetByIdAsync(id, cancellationToken);
        return Ok(concert);
    }
}
