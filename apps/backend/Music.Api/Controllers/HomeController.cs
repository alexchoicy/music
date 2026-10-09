using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Home;

namespace Music.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.BotAllowed)]
[Route("home")]
public class HomeController(IHomeService homeService) : ControllerBase
{
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(typeof(HomeOverview), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOverviewAsync(CancellationToken cancellationToken)
    {
        return Ok(await homeService.GetOverviewAsync(cancellationToken));
    }
}
