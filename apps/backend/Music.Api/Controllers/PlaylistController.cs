using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Music.Core.Services.Playlists;

namespace Music.Api.Controllers;

[ApiController]
[Route("playlists")]
[Authorize]
public class PlaylistController(IPlaylistService playlistService) : ControllerBase
{
    private string UserId =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new ValidationException("Missing user identifier claim.");

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<PlaylistListItem>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken) =>
        Ok(await playlistService.GetAllAsync(UserId, cancellationToken));

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PlaylistDetails), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken) =>
        Ok(await playlistService.GetByIdAsync(id, UserId, cancellationToken));

    [HttpPost]
    [ProducesResponseType(typeof(PlaylistDetails), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(
        [FromBody] CreatePlaylistRequest request,
        CancellationToken cancellationToken
    )
    {
        var playlist = await playlistService.CreateAsync(request, UserId, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = playlist.PlaylistId }, playlist);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Rename(
        int id,
        [FromBody] RenamePlaylistRequest request,
        CancellationToken cancellationToken
    )
    {
        await playlistService.RenameAsync(id, request, UserId, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(
        int id,
        [FromQuery, BindRequired] uint version,
        CancellationToken cancellationToken
    )
    {
        await playlistService.DeleteAsync(id, version, UserId, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:int}/entries")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AddEntries(
        int id,
        [FromBody] AddPlaylistEntriesRequest request,
        CancellationToken cancellationToken
    )
    {
        await playlistService.AddEntriesAsync(id, request, UserId, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}/entries/{entryId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RemoveEntry(
        int id,
        int entryId,
        [FromQuery, BindRequired] uint version,
        CancellationToken cancellationToken
    )
    {
        await playlistService.RemoveEntryAsync(id, entryId, version, UserId, cancellationToken);
        return NoContent();
    }

    [HttpPut("{id:int}/entries/order")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ReorderEntries(
        int id,
        [FromBody] ReorderPlaylistEntriesRequest request,
        CancellationToken cancellationToken
    )
    {
        await playlistService.ReorderEntriesAsync(id, request, UserId, cancellationToken);
        return NoContent();
    }
}
