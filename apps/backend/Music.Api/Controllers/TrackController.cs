using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Tracks;

namespace Music.Api.Controllers;

[ApiController]
[Route("tracks")]
[Authorize]
public class TrackController(ITrackService trackService) : ControllerBase
{
    private string UserId =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new ValidationException("Missing user identifier claim.");

    [HttpPost("radio")]
    [ProducesResponseType(typeof(IReadOnlyList<RadioTrack>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRadioTracks(
        [FromBody] RadioTrackRequest request,
        CancellationToken cancellationToken
    )
    {
        return Ok(await trackService.GetRadioTracksAsync(request, UserId, cancellationToken));
    }
}
