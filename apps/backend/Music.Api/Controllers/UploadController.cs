using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Common.Constants;
using Music.Core.Services.Uploads;
using Music.Core.Services.Uploads.Requests;
using Music.Core.Services.Uploads.Results;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("uploads")]
public class UploadController(IUploadService uploadService) : ControllerBase
{
    private readonly IUploadService _uploadService = uploadService;

    [HttpPost("Init")]
    [Produces("application/json")]
    [Authorize(AuthorizationPolicies.UploadAllowed)]
    [ProducesResponseType(typeof(MultipartUploadResults), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Init(
        [FromBody] CreateUploadRequest request,
        CancellationToken cancellationToken
    )
    {
        MultipartUploadResults result = await _uploadService.Init(request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("complete")]
    [Authorize(AuthorizationPolicies.UploadAllowed)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Complete(
        [FromBody] CompleteUploadRequest request,
        CancellationToken cancellationToken
    )
    {
        string userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new ValidationException("Missing user identifier claim.");

        await _uploadService.Complete(request, userId, cancellationToken);
        return Ok();
    }
}
