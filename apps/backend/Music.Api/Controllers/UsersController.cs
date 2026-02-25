using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Api.Dtos.Requests;
using Music.Api.Dtos.Responses;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Api.Controllers;

[ApiController]
[Route("users")]
public sealed class UsersController(IAuthService authService) : ControllerBase
{
    private readonly IAuthService _authService = authService;

    [HttpPost]
    [Authorize(Policy = "RequireAdminRole")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserRequest request)
    {
        UserInfo user = await _authService.CreateUserAsync(request.Username, request.Password, request.Role);

        return StatusCode(StatusCodes.Status201Created, new UserDto
        {
            Id = user.Id,
            UserName = user.UserName,
            Roles = user.Roles,
        });
    }
}
