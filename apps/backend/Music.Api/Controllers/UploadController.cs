using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Api.Dtos.Requests;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("uploads")]
public class UploadController(IContentService contentService) : ControllerBase
{
    // [HttpPost("audio/test-process")]
    // [Produces("application/json")]
    // [ProducesResponseType(StatusCodes.Status200OK)]
    // [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    // public IActionResult QueueAudioUploadProcess(
    //     [FromBody] TrackUploadProcessTestRequest request)
    // {
    //     TrackUploadProcessWorkerModel workerModel = new()
    //     {
    //         FileObjectId = request.FileObjectId,
    //     };

    //     contentService.RunBackgroundProcessAudioUploadFile(workerModel);

    //     return Ok();
    // }

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

        await contentService.CompleteAudioMultipartUploadAsync(request, userId, cancellationToken);

        return Ok();
    }
}
