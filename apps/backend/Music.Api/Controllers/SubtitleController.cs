using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Common.Constants;
using Music.Core.Services.Subtitles;
using Music.Core.Services.Subtitles.Requests;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
public sealed class SubtitleController(ISubtitleService subtitleService) : ControllerBase
{
    private readonly ISubtitleService _subtitleService = subtitleService;

    private string UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new ValidationException("Missing user identifier claim.");

    [HttpGet("subtitles/{id:int}")]
    [ProducesResponseType(typeof(SubtitleDetails), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        [FromRoute] [Required] int id,
        CancellationToken cancellationToken
    )
    {
        return Ok(await _subtitleService.GetAsync(id, cancellationToken));
    }

    [HttpGet("subtitles/{id:int}/lyrics")]
    [ProducesResponseType(typeof(SubtitleLyrics), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLyrics(
        [FromRoute] [Required] int id,
        CancellationToken cancellationToken
    )
    {
        return Ok(await _subtitleService.GetLyricsAsync(id, cancellationToken));
    }

    [HttpPost("albums/{albumId:int}/tracks/{trackId:int}/subtitles")]
    [Authorize(AuthorizationPolicies.RequireUploaderRole)]
    [ProducesResponseType(typeof(SubtitleDetails), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateForTrack(
        [FromRoute] [Required] int albumId,
        [FromRoute] [Required] int trackId,
        [FromBody] CreateSubtitleRequest request,
        CancellationToken cancellationToken
    )
    {
        return Ok(
            await _subtitleService.CreateForTrackAsync(
                albumId,
                trackId,
                request,
                UserId,
                cancellationToken
            )
        );
    }

    [HttpPost("concerts/{concertId:int}/files/{concertFileId:int}/subtitles")]
    [Authorize(AuthorizationPolicies.RequireUploaderRole)]
    [ProducesResponseType(typeof(SubtitleDetails), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateForConcertFile(
        [FromRoute] [Required] int concertId,
        [FromRoute] [Required] int concertFileId,
        [FromBody] CreateSubtitleRequest request,
        CancellationToken cancellationToken
    )
    {
        return Ok(
            await _subtitleService.CreateForConcertFileAsync(
                concertId,
                concertFileId,
                request,
                UserId,
                cancellationToken
            )
        );
    }

    [HttpPut("subtitles/{id:int}")]
    [Authorize(AuthorizationPolicies.RequireUploaderRole)]
    [ProducesResponseType(typeof(SubtitleDetails), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        [FromRoute] [Required] int id,
        [FromBody] UpdateSubtitleRequest request,
        CancellationToken cancellationToken
    )
    {
        return Ok(await _subtitleService.UpdateAsync(id, request, cancellationToken));
    }

    [HttpDelete("subtitles/{id:int}")]
    [Authorize(AuthorizationPolicies.RequireUploaderRole)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        [FromRoute] [Required] int id,
        CancellationToken cancellationToken
    )
    {
        await _subtitleService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
