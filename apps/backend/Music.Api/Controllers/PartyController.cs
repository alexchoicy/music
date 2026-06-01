using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Parties;
using Music.Core.Services.Parties.Requests;

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
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreatePartyAsync([FromBody] CreatePartyRequest request)
    {
        string userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;

        bool created = await _partyService.CreatePartyAsync(request, userId);

        if (!created)
        {
            return BadRequest();
        }

        return Created();
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
