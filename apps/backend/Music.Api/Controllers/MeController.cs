using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Auth;

namespace Music.Api.Controllers;

[ApiController]
[Route("me")]
[Authorize]
public class MeController(IMeService meService) : ControllerBase
{
    private readonly IMeService _meService = meService;

    [HttpGet]
    [ProducesResponseType(typeof(UserInfo), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserInfo>> GetMe()
    {
        string? userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        UserInfo? userInfo = await _meService.GetCurrentUserAsync(userId);

        if (userInfo is null)
        {
            return Unauthorized();
        }

        return Ok(userInfo);
    }
}
