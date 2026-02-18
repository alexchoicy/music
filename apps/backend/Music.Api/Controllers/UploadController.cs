using Microsoft.AspNetCore.Mvc;
using Music.Core.Models;
using Music.Infrastructure.Services.Storage;

namespace Music.Api.Controllers;

[ApiController]
[Route("uploads")]
public class UploadController(S3ContentService s3ContentService) : ControllerBase
{
    // audio only, for extra/concert do it in other methods
    [HttpPost("audio/complete-multipart")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> CompleteAudioMultipartUpload([FromBody] List<CompleteMultipartUploadRequest> request)
    {
        await s3ContentService.CompleteAudioMultipartUploadAsync(request);

        return Ok();
    }
}
