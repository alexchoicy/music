using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Common.Constants;
using Music.Core.Services.Albums;
using Music.Core.Services.Albums.Requests;
using Music.Core.Services.Albums.Results;
using Music.Core.Services.Inbox;

namespace Music.Api.Controllers;

[ApiController]
[Route("inbox")]
[Authorize]
public class InboxController(IInboxService inboxService, IAlbumService albumService)
    : ControllerBase
{
    private string UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new ValidationException("Missing user identifier claim.");

    [HttpPost]
    [Authorize(AuthorizationPolicies.UploadAllowed)]
    [ProducesResponseType(typeof(CreateInboxGroupResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateGroup(
        [FromBody] CreateInboxGroupRequest request,
        CancellationToken cancellationToken
    ) => Ok(await inboxService.CreateGroupAsync(request, UserId, cancellationToken));

    [HttpGet("groups")]
    [Authorize(AuthorizationPolicies.RequireAdminRole)]
    [ProducesResponseType(typeof(IReadOnlyList<InboxGroupListItem>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGroups(
        [FromQuery] bool includeResolved,
        CancellationToken cancellationToken
    ) => Ok(await inboxService.GetGroupsAsync(includeResolved, cancellationToken));

    [HttpGet("groups/{id:guid}")]
    [Authorize(AuthorizationPolicies.RequireAdminRole)]
    [ProducesResponseType(typeof(InboxGroupDetails), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetGroup(
        [FromRoute] Guid id,
        CancellationToken cancellationToken
    ) => Ok(await inboxService.GetGroupAsync(id, cancellationToken));

    [HttpPost("items/discard")]
    [Authorize(AuthorizationPolicies.RequireAdminRole)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DiscardItems(
        [FromBody] InboxItemIdsRequest request,
        CancellationToken cancellationToken
    )
    {
        await inboxService.DiscardItemsAsync(request.ItemIds, cancellationToken);
        return NoContent();
    }

    [HttpPost("items/restore")]
    [Authorize(AuthorizationPolicies.RequireAdminRole)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RestoreItems(
        [FromBody] InboxItemIdsRequest request,
        CancellationToken cancellationToken
    )
    {
        await inboxService.RestoreItemsAsync(request.ItemIds, cancellationToken);
        return NoContent();
    }

    [HttpPost("albums")]
    [Authorize(AuthorizationPolicies.RequireAdminRole)]
    [ProducesResponseType(typeof(IReadOnlyList<CreateAlbumResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(
        typeof(IReadOnlyList<CreateAlbumResult>),
        StatusCodes.Status207MultiStatus
    )]
    [ProducesResponseType(
        typeof(IReadOnlyList<CreateAlbumResult>),
        StatusCodes.Status400BadRequest
    )]
    public async Task<IActionResult> CreateAlbums(
        [FromBody] [Required] IReadOnlyList<CreateAlbumRequest> request,
        CancellationToken cancellationToken
    )
    {
        if (request.Count == 0)
            return BadRequest("At least one album is required.");

        IReadOnlyList<CreateAlbumResult> results = await albumService.CreateAlbumAsync(
            request,
            UserId,
            allowInboxItems: true,
            cancellationToken
        );

        if (results.All(r => r.IsSuccess))
            return Ok(results);

        if (results.All(r => !r.IsSuccess))
            return BadRequest(results);

        return StatusCode(StatusCodes.Status207MultiStatus, results);
    }
}
