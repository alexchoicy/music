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
}
