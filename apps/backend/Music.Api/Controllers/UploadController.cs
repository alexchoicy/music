using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Models;
using Music.Infrastructure.Services.Storage;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("uploads")]
public class UploadController(S3ContentService s3ContentService) : ControllerBase
{
    // audio only, for extra/concert do it in other methods
    [HttpPost("audio/complete-multipart")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CompleteAudioMultipartUpload(
        [FromBody] List<CompleteMultipartUploadRequest> request,
        CancellationToken cancellationToken)
    {
        string userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new ValidationException("Missing user identifier claim.");

        await s3ContentService.CompleteAudioMultipartUploadAsync(request, userId, cancellationToken);

        return Ok();
    }
}
