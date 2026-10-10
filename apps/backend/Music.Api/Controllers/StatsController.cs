using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Common.Constants;
using Music.Core.Services.Stats;

namespace Music.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.BotAllowed)]
[Route("stats")]
public class StatsController(IStatsService statsService) : ControllerBase
{
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(typeof(LibraryStats), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLibraryStatsAsync(CancellationToken cancellationToken)
    {
        return Ok(await statsService.GetLibraryStatsAsync(cancellationToken));
    }
}
