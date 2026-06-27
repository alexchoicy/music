using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Common.Constants;
using Music.Core.Services.Auth;
using Music.Core.Services.Auth.Enums;

namespace Music.Api.Controllers;

[ApiController]
[Route("users")]
public class UserController(IAuthService authService) : ControllerBase
{
    [HttpPost]
    [Authorize(AuthorizationPolicies.RequireAdminRole)]
    [ProducesResponseType(typeof(UserInfo), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserInfo>> CreateAccount([FromBody] CreateUserRequest request)
    {
        var user = await authService.CreateUserAsync(request);
        return Ok(user);
    }

    [HttpGet]
    [Authorize(AuthorizationPolicies.RequireAdminRole)]
    [ProducesResponseType(typeof(IList<UserInfo>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IList<UserInfo>>> GetUsers()
    {
        var users = await authService.GetUsersAsync();
        return Ok(users);
    }

    [HttpPatch("{id}")]
    [Authorize]
    [ProducesResponseType(typeof(UserInfo), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<UserInfo>> UpdateUser(
        [FromRoute] string id,
        [FromBody] UpdateUserRequest request
    )
    {
        List<string> userRoles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        string? userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        bool isOwner = userRoles.Contains("Owner");
        bool isAdmin = userRoles.Contains("Admin");

        if (!isOwner && !isAdmin && userId != id)
        {
            return Forbid();
        }

        if (
            isAdmin
            && !isOwner
            && userId != id
            && request.Role.HasValue
            && request.Role.Value == Roles.Admin
        )
        {
            return Forbid();
        }

        try
        {
            UserInfo user = await authService.UpdateUserAsync(id, request);
            return Ok(user);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }
}
