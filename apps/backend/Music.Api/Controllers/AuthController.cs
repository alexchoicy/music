using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Common.Constants;
using Music.Core.Services.Auth;

namespace Music.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(
    IAuthService authService,
    ITokenService tokenService,
    IConfiguration configuration
) : ControllerBase
{
    private readonly IAuthService _authService = authService;
    private readonly ITokenService _tokenService = tokenService;
    private readonly string AuthCookieName =
        configuration.GetValue<string>("Cookies:Name") ?? "AlexCoolMusicAppToken";
    private readonly string AuthCookieDomain =
        configuration.GetValue<string>("Cookies:Domain") ?? "localhost";

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResult>> Login([FromBody] LoginRequest request)
    {
        LoginResult? result = await _authService.LoginAsync(request.Username, request.Password);

        if (result is null)
        {
            return Problem(
                title: "InvalidCredentials",
                detail: "Invalid username or password.",
                statusCode: StatusCodes.Status401Unauthorized
            );
        }

        Response.Cookies.Append(
            AuthCookieName,
            result.Token,
            new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Secure = true,
                IsEssential = true,
                Expires = DateTimeOffset.UtcNow.AddDays(7),
                Domain = AuthCookieDomain,
            }
        );

        return Ok(result);
    }

    [HttpGet]
    [Authorize]
    public ActionResult<string> GetProtectedResource()
    {
        return Ok();
    }

    [HttpPost("bot-token")]
    [Authorize(Policy = AuthorizationPolicies.RequireAdminRole)]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<string>> CreateBotToken()
    {
        string userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new ValidationException("Missing user identifier claim.");

        string token = await _tokenService.GenerateBotToken(userId);
        return Ok(token);
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(
            AuthCookieName,
            new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Secure = true,
                IsEssential = true,
                Domain = AuthCookieDomain,
            }
        );
        return Ok();
    }
}
