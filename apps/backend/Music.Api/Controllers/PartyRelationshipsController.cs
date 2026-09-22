using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Parties;
using Music.Core.Services.Parties.Requests;
using Music.Core.Services.Parties.Results;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("parties/{sourcePartyId:int}/relationships")]
public sealed class PartyRelationshipsController(IPartyRelationshipService relationshipService)
    : ControllerBase
{
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(typeof(PartyRelationshipGraph), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetGraphAsync(
        [FromRoute, Range(1, int.MaxValue)] int sourcePartyId,
        CancellationToken cancellationToken
    )
    {
        return Ok(await relationshipService.GetGraphAsync(sourcePartyId, cancellationToken));
    }

    [HttpPost]
    [Produces("application/json")]
    [ProducesResponseType(typeof(CreatePartyRelationshipResult), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateRelationshipAsync(
        [FromRoute, Range(1, int.MaxValue)] int sourcePartyId,
        [FromBody] CreatePartyRelationshipRequest request,
        CancellationToken cancellationToken
    )
    {
        var result = await relationshipService.CreateRelationshipAsync(
            sourcePartyId,
            request,
            cancellationToken
        );

        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpDelete("/relationships/{relationshipId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteRelationshipAsync(
        [FromRoute] Guid relationshipId,
        CancellationToken cancellationToken
    )
    {
        await relationshipService.DeleteRelationshipAsync(relationshipId, cancellationToken);

        return NoContent();
    }
}
