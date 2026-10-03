using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.ListeningHistory;

namespace Music.Api.Controllers;

[ApiController]
[Route("history")]
[Authorize]
public class ListeningHistoryController(IListeningHistoryService listeningHistoryService)
    : ControllerBase
{
    private string UserId =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new ValidationException("Missing user identifier claim.");

    [HttpGet]
    [ProducesResponseType(typeof(ListeningHistoryPage), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPage(
        [FromQuery] ListeningHistoryPageRequest request,
        CancellationToken cancellationToken
    ) => Ok(await listeningHistoryService.GetPageAsync(request, UserId, cancellationToken));

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Record(
        [FromBody] RecordListeningHistoryRequest request,
        CancellationToken cancellationToken
    )
    {
        await listeningHistoryService.RecordAsync(request, UserId, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteEntry(long id, CancellationToken cancellationToken)
    {
        await listeningHistoryService.DeleteEntryAsync(id, UserId, cancellationToken);
        return NoContent();
    }

    [HttpGet("counts")]
    [ProducesResponseType(typeof(ListeningHistoryCounts), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCounts(CancellationToken cancellationToken) =>
        Ok(await listeningHistoryService.GetCountsAsync(UserId, cancellationToken));
}
