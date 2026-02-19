using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Interfaces;
using Music.Api.Dtos.Requests;
using Music.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace Music.Api.Controllers;

[ApiController]
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

        bool created = await _partyService.CreatePartyAsync(new CreatePartyModel
        {
            Name = request.Name,
            PartyType = request.PartyType,
            LanguageId = request.LanguageId
        }, userId);

        if (!created)
        {
            return BadRequest();
        }

        return Created();
    }

    [HttpGet("list")]
    [Authorize]
    [Produces("application/json")]
    [ProducesResponseType(typeof(IReadOnlyList<PartyListModel>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllForListAsync([FromQuery] PartyListParams @params)
    {
        IReadOnlyList<PartyListModel> list = await _partyService.GetAllForListAsync(@params ?? new PartyListParams());
        return Ok(list);
    }

    [HttpGet]
    [Authorize]
    [Produces("application/json")]
    [ProducesResponseType(typeof(IReadOnlyList<PartyModel>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllParties()
    {
        IReadOnlyList<PartyModel> parties = await _partyService.GetAllPartiesAsync();
        return Ok(parties);
    }

    [HttpGet("{id:int}")]
    [Authorize]
    [Produces("application/json")]
    [ProducesResponseType(typeof(PartyDetailModel), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetParty(int id, CancellationToken cancellationToken)
    {
        PartyDetailModel? party = await _partyService.GetPartyByIdAsync(id, cancellationToken);
        return Ok(party);
    }
}
