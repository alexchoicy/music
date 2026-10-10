using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Home;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("home")]
public class HomeController(IHomeService homeService) : ControllerBase
{
    private string UserId =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new ValidationException("Missing user identifier claim.");

    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(typeof(HomeFeed), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFeedAsync(CancellationToken cancellationToken)
    {
        return Ok(await homeService.GetFeedAsync(UserId, cancellationToken));
    }
}
