using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Tracks;

namespace Music.Api.Controllers;

[ApiController]
[Route("tracks")]
[Authorize]
public class TrackController(ITrackService trackService) : ControllerBase
{
    [HttpPost("radio")]
    [ProducesResponseType(typeof(RadioTrack), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> GetRadioTrack(
        [FromBody] RadioTrackRequest request,
        CancellationToken cancellationToken
    )
    {
        RadioTrack? track = await trackService.GetRadioTrackAsync(request, cancellationToken);
        return track is null ? NoContent() : Ok(track);
    }
}
