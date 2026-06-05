using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Common.Constants;
using Music.Core.Services.Uploads;
using Music.Core.Services.Uploads.Requests;
using Music.Core.Services.Uploads.Results;

namespace Music.Api.Controllers;

[ApiController]
[Route("uploads")]
public class UploadController(IUploadService uploadService) : ControllerBase
{
    private readonly IUploadService _uploadService = uploadService;

    //TODO: add a upload session
    [HttpPost("Init")]
    [Authorize(AuthorizationPolicies.UploadAllowed)]
    [ProducesResponseType(typeof(MultipartUploadResults), StatusCodes.Status200OK)]
    public async Task<IActionResult> Init(
        [FromBody] CreateUploadRequest request,
        CancellationToken cancellationToken
    )
    {
        var result = await _uploadService.Init(request, cancellationToken);

        return Ok(result);
    }

    [HttpPost("complete")]
    [Authorize(AuthorizationPolicies.UploadAllowed)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Complete(
        [FromBody] CompleteUploadRequest request,
        CancellationToken cancellationToken
    )
    {
        await _uploadService.Complete(request, cancellationToken);
        return NoContent();
    }
}
