using Microsoft.AspNetCore.Mvc;
using Music.Core.Models;
using Music.Infrastructure.Services.Storage;

namespace Music.Api.Controllers;

[ApiController]
[Route("uploads")]
public class UploadController(S3ContentService s3ContentService) : ControllerBase
{

    [HttpPost("complete-multipart")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> CompleteMultipartUpload([FromBody] List<CompleteMultipartUploadRequest> request)
    {

        await s3ContentService.CompleteMultipartUploadAsync(request);

        return Ok();
    }
}
