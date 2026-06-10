using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Parties;
using Music.Core.Services.Parties.Requests;
using Music.Core.Services.Parties.Results;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("parties")]
public class PartyController(IPartyService partyService) : ControllerBase
{
    private readonly IPartyService _partyService = partyService;

    [HttpPost]
    [Authorize]
    [Produces("application/json")]
    [ProducesResponseType(typeof(CreatePartyResult), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreatePartyAsync(
        [FromBody] CreatePartyRequest request,
        CancellationToken cancellationToken
    )
    {
        string userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;

        int partyId = await _partyService.CreatePartyAsync(request, userId, cancellationToken);

        if (partyId <= 0)
        {
            return BadRequest();
        }

        return StatusCode(StatusCodes.Status201Created, new CreatePartyResult { PartyId = partyId });
    }

    [HttpGet]
    [Authorize]
    [Produces("application/json")]
    [ProducesResponseType(typeof(IReadOnlyList<PartyItems>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllParties(CancellationToken cancellationToken)
    {
        IList<PartyItems> parties = await _partyService.GetAllAsync(cancellationToken);
        return Ok(parties);
    }
}
