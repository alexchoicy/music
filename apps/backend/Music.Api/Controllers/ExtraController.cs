using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Common.Constants;
using Music.Core.Services.Extras;
using Music.Core.Services.Extras.Requests;
using Music.Core.Services.Extras.Results;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
public sealed class ExtraController(IExtraService extraService) : ControllerBase
{
    private readonly IExtraService _extraService = extraService;

    [HttpGet("albums/{albumId:int}/extras")]
    [ProducesResponseType(typeof(IReadOnlyList<ExtraDetails>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByAlbum(
        [FromRoute] [Required] int albumId,
        CancellationToken cancellationToken
    )
    {
        IReadOnlyList<ExtraDetails> extras = await _extraService.GetByAlbumIdAsync(
            albumId,
            cancellationToken
        );
        return Ok(extras);
    }

    [HttpPost("albums/{albumId:int}/extras")]
    [Authorize(AuthorizationPolicies.UploadAllowed)]
    [Authorize(AuthorizationPolicies.RequireUploaderRole)]
    [ProducesResponseType(typeof(SaveExtraResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateForAlbum(
        [FromRoute] [Required] int albumId,
        [FromBody] SaveExtraRequest request,
        CancellationToken cancellationToken
    )
    {
        SaveExtraResult result = await _extraService.CreateForAlbumAsync(
            albumId,
            request,
            GetUserId(),
            cancellationToken
        );
        return Ok(result);
    }

    [HttpPut("extras/{extraId:guid}")]
    [Authorize(AuthorizationPolicies.UploadAllowed)]
    [Authorize(AuthorizationPolicies.RequireUploaderRole)]
    [ProducesResponseType(typeof(SaveExtraResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        [FromRoute] [Required] Guid extraId,
        [FromBody] SaveExtraRequest request,
        CancellationToken cancellationToken
    )
    {
        SaveExtraResult result = await _extraService.UpdateAsync(
            extraId,
            request,
            GetUserId(),
            cancellationToken
        );
        return Ok(result);
    }

    [HttpDelete("extras/{extraId:guid}")]
    [Authorize(AuthorizationPolicies.UploadAllowed)]
    [Authorize(AuthorizationPolicies.RequireUploaderRole)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        [FromRoute] [Required] Guid extraId,
        CancellationToken cancellationToken
    )
    {
        await _extraService.DeleteAsync(extraId, cancellationToken);
        return NoContent();
    }

    private string GetUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new ValidationException("Missing user identifier claim.");
}
