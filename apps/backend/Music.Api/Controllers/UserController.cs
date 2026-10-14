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
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<UserInfo>> CreateAccount([FromBody] CreateUserRequest request)
    {
        if (!CanAssignRole(request.Role))
        {
            return Forbid();
        }

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
        UserInfo? target = await authService.GetUserAsync(id);
        if (target is null)
        {
            return NotFound();
        }

        if (!CanEditAccount(target))
        {
            return Forbid();
        }

        bool changesRole =
            request.Role is { } role
            && !(target.Roles.Count == 1 && target.Roles[0] == role.ToString());
        if (changesRole && (IsSelf(target) || !CanAssignRole(request.Role!.Value)))
        {
            return Forbid();
        }

        UserInfo user = await authService.UpdateUserAsync(id, request);
        return Ok(user);
    }

    private bool IsSelf(UserInfo target) =>
        target.Id == User.FindFirstValue(ClaimTypes.NameIdentifier);

    private bool IsOwner => User.IsInRole(nameof(Roles.Owner));

    private bool IsAdmin => User.IsInRole(nameof(Roles.Admin));

    private bool CanEditAccount(UserInfo target)
    {
        if (IsSelf(target))
        {
            return true;
        }

        if (target.Roles.Contains(nameof(Roles.Owner)))
        {
            return false;
        }

        return IsOwner || (IsAdmin && !target.Roles.Contains(nameof(Roles.Admin)));
    }

    private bool CanAssignRole(Roles role) =>
        role switch
        {
            Roles.Owner => false,
            Roles.Admin => IsOwner,
            _ => IsOwner || IsAdmin,
        };
}
