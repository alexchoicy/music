using System.ComponentModel.DataAnnotations;
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

    [HttpPatch("{id:int}")]
    [ProducesResponseType(typeof(UpdatePartyResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePartyAsync(
        [FromRoute] int id,
        [FromBody] UpdatePartyRequest request,
        CancellationToken cancellationToken
    )
    {
        string userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        try
        {
            var result = await _partyService.UpdatePartyAsync(id, request, userId, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (ValidationException exception)
        {
            return BadRequest(new ProblemDetails { Detail = exception.Message });
        }
    }

    [HttpPatch("{id:int}/aliases")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAliasesAsync(int id, [FromBody] PartyAliasBatchRequest request, CancellationToken cancellationToken)
    {
        string userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        try
        {
            var result = await _partyService.UpdateAliasesAsync(id, request, userId, cancellationToken);
            return result ? Ok() : NotFound();
        }
        catch (ValidationException exception)
        {
            return BadRequest(new ProblemDetails { Detail = exception.Message });
        }
    }

    [HttpPatch("{id:int}/external-infos")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateExternalInfosAsync(int id, [FromBody] PartyExternalInfoBatchRequest request, CancellationToken cancellationToken)
    {
        string userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        try
        {
            var result = await _partyService.UpdateExternalInfosAsync(id, request, userId, cancellationToken);
            return result ? Ok() : NotFound();
        }
        catch (ValidationException exception)
        {
            return BadRequest(new ProblemDetails { Detail = exception.Message });
        }
    }

    [HttpPatch("{id:int}/images")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateImagesAsync(int id, [FromBody] PartyImageBatchRequest request, CancellationToken cancellationToken)
    {
        string userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        try
        {
            var result = await _partyService.UpdateImagesAsync(id, request, userId, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (ValidationException exception)
        {
            return BadRequest(new ProblemDetails { Detail = exception.Message });
        }
    }

    [HttpGet]
    [Authorize]
    [Produces("application/json")]
    [ProducesResponseType(typeof(IReadOnlyList<PartyItems>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllParties(
        [FromQuery] PartyListRequest request,
        CancellationToken cancellationToken
    )
    {
        IList<PartyItems> parties = await _partyService.GetAllAsync(request, cancellationToken);
        return Ok(parties);
    }

    [HttpGet("{id:int}")]
    [Authorize]
    [Produces("application/json")]
    [ProducesResponseType(typeof(PartyDetails), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPartyById(
        [FromRoute] [Required] int id,
        CancellationToken cancellationToken
    )
    {
        PartyDetails? party = await _partyService.GetPartyByIdAsync(id, cancellationToken);

        if (party is null)
        {
            return NotFound();
        }

        return Ok(party);
    }
}
