using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Interfaces;
using Music.Api.Dtos.Requests;
using Microsoft.AspNetCore.Authorization;
using Music.Api.Dtos.Responses;
using Music.Core.Models;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Music.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(IAuthService authService, ITokenService tokenService, IConfiguration configuration) : ControllerBase
{
    private readonly IAuthService _authService = authService;
    private readonly ITokenService _tokenService = tokenService;
    private readonly string AuthCookieName = configuration.GetValue<string>("Cookies:Name") ?? "AlexCoolMusicAppToken";
    private readonly string AuthCookieDomain = configuration.GetValue<string>("Cookies:Domain") ?? "localhost";

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {

        AuthSession? result = await _authService.LoginAsync(request.Username, request.Password);

        if (result is null)
        {
            return Problem(
                title: "InvalidCredentials",
                detail: "Invalid username or password.",
                statusCode: StatusCodes.Status401Unauthorized);

        }

        Response.Cookies.Append(AuthCookieName, result.Token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = true,
            IsEssential = true,
            Expires = DateTimeOffset.UtcNow.AddDays(7),
            Domain = AuthCookieDomain,
            Path = "/",
        });

        return Ok(new LoginResponse
        {
            Token = result.Token,
            User = new UserDto
            {
                Id = result.User.Id,
                UserName = result.User.UserName,
                Roles = result.User.Roles,
            },
        });
    }

    [HttpGet]
    [Authorize]
    public ActionResult<string> GetProtectedResource()
    {
        return Ok();
    }

    [HttpPost("bot-token")]
    [Authorize(Policy = "RequireAdminRole")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<string> CreateBotToken()
    {
        string userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new ValidationException("Missing user identifier claim.");

        string token = _tokenService.GenerateBotToken(userId);
        return Ok(token);
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(AuthCookieName);
        return Ok();
    }
}
