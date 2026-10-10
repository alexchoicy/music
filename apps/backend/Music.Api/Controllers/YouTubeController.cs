using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Common.Constants;
using Music.Core.Services.YouTube;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("youtube")]
public class YouTubeController(IYouTubeService youTubeService) : ControllerBase
{
    private readonly IYouTubeService _youTubeService = youTubeService;

    [HttpGet("info")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(YouTubeVideoInfo), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetInfo(
        [FromQuery] [Required] string url,
        CancellationToken cancellationToken
    )
    {
        YouTubeVideoInfo info = await _youTubeService.GetVideoInfoAsync(url, cancellationToken);
        return Ok(info);
    }

    [HttpPost("covers")]
    [Produces("application/json")]
    [Authorize(AuthorizationPolicies.UploadAllowed)]
    [ProducesResponseType(typeof(CreateYouTubeCoverResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateCover(
        [FromBody] CreateYouTubeCoverRequest request,
        CancellationToken cancellationToken
    )
    {
        string userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new ValidationException("Missing user identifier claim.");

        CreateYouTubeCoverResult result = await _youTubeService.CreateCoverAsync(
            request,
            userId,
            cancellationToken
        );

        return Ok(result);
    }

    [HttpGet("jobs/{jobId:guid}")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(YouTubeImportJobStatus), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetJobStatus(
        [FromRoute] Guid jobId,
        CancellationToken cancellationToken
    )
    {
        YouTubeImportJobStatus status = await _youTubeService.GetImportJobStatusAsync(
            jobId,
            cancellationToken
        );

        return Ok(status);
    }

    [HttpPost("jobs/{jobId:guid}/retry")]
    [Authorize(AuthorizationPolicies.UploadAllowed)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RetryJob(
        [FromRoute] Guid jobId,
        CancellationToken cancellationToken
    )
    {
        await _youTubeService.RetryImportJobAsync(jobId, cancellationToken);
        return Ok();
    }
}
