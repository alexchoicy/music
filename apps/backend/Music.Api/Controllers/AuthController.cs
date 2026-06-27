using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Common.Constants;
using Music.Core.Services.Auth;
using Music.Infrastructure.Entities;

namespace Music.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(
    IAuthService authService,
    ITokenService tokenService,
    UserManager<User> userManager,
    SignInManager<User> signInManager,
    IConfiguration configuration
) : ControllerBase
{
    private readonly IAuthService _authService = authService;
    private readonly ITokenService _tokenService = tokenService;
    private readonly UserManager<User> _userManager = userManager;
    private readonly SignInManager<User> _signInManager = signInManager;
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

    [HttpPost("passkey-request-options")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(JsonElement), StatusCodes.Status200OK)]
    public async Task<IActionResult> PassKeyRequestOptions([FromQuery] string? username = null)
    {
        User? user = string.IsNullOrWhiteSpace(username)
            ? null
            : await _userManager.FindByNameAsync(username);

        string json = await _signInManager.MakePasskeyRequestOptionsAsync(user);
        return Content(json, "application/json");
    }

    [HttpPost("passkey-signin")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PassKeySignIn([FromBody] JsonElement credential)
    {
        PasskeyAssertionResult<User> assertion;
        try
        {
            assertion = await _signInManager.PerformPasskeyAssertionAsync(credential.GetRawText());
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }

        if (!assertion.Succeeded)
            return Unauthorized();

        IdentityResult stored = await _userManager.AddOrUpdatePasskeyAsync(
            assertion.User,
            assertion.Passkey
        );

        if (!stored.Succeeded)
            return Unauthorized();

        IList<string> roles = await _userManager.GetRolesAsync(assertion.User);

        UserInfo userInfo = new()
        {
            Id = assertion.User.Id,
            UserName = assertion.User.UserName ?? string.Empty,
            Roles = roles.ToList(),
        };

        string token = await _tokenService.GenerateUserToken(userInfo);

        Response.Cookies.Append(
            AuthCookieName,
            token,
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

        return Ok(new LoginResult { Token = token, User = userInfo });
    }

    [HttpPost("passkey-creation-options")]
    [Authorize]
    public async Task<IActionResult> PassKeyCreationOptions()
    {
        User? user = await _userManager.GetUserAsync(User);
        if (user is null)
            return NotFound();

        string userId = await _userManager.GetUserIdAsync(user);
        string userName = await _userManager.GetUserNameAsync(user) ?? "User";

        string json = await _signInManager.MakePasskeyCreationOptionsAsync(
            new()
            {
                Id = userId,
                Name = userName,
                DisplayName = userName,
            }
        );

        return Content(json, "application/json");
    }

    [HttpPost("passkey-register")]
    [Authorize]
    [ProducesResponseType(typeof(PasskeyDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> PassKeyRegister([FromBody] JsonElement credential)
    {
        User? user = await _userManager.GetUserAsync(User);
        if (user is null)
            return NotFound();

        string userId = await _userManager.GetUserIdAsync(user);

        PasskeyAttestationResult result;
        try
        {
            result = await _signInManager.PerformPasskeyAttestationAsync(credential.GetRawText());
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }

        if (!result.Succeeded)
            return BadRequest(result.Failure.Message);

        if (result.UserEntity.Id != userId)
            return BadRequest("Passkey user does not match the current user.");

        IdentityResult stored = await _userManager.AddOrUpdatePasskeyAsync(user, result.Passkey);

        if (!stored.Succeeded)
            return BadRequest(stored.Errors);

        return Ok(
            new PasskeyDto
            {
                Id = Convert.ToBase64String(result.Passkey.CredentialId),
                Name = result.Passkey.Name ?? string.Empty,
                CreatedAt = result.Passkey.CreatedAt,
                Transports = result.Passkey.Transports.ToList(),
                DeviceType = result.Passkey.IsBackupEligible ? "multiDevice" : "singleDevice",
            }
        );
    }

    [HttpGet("passkeys")]
    [Authorize]
    public async Task<IActionResult> PassKeys()
    {
        User? user = await _userManager.GetUserAsync(User);
        if (user is null)
            return NotFound();

        IList<UserPasskeyInfo> passkeys = await _userManager.GetPasskeysAsync(user);

        List<PasskeyDto> dtos = passkeys
            .Select(p => new PasskeyDto
            {
                Id = Convert.ToBase64String(p.CredentialId),
                Name = p.Name ?? string.Empty,
                CreatedAt = p.CreatedAt,
                Transports = p.Transports.ToList(),
                DeviceType = p.IsBackupEligible ? "multiDevice" : "singleDevice",
            })
            .ToList();

        return Ok(dtos);
    }

    [HttpPost("passkeys")]
    [Authorize]
    public async Task<IActionResult> PassKeyEdit([FromBody] PasskeyEditRequest request)
    {
        User? user = await _userManager.GetUserAsync(User);
        if (user is null)
            return NotFound();

        IList<UserPasskeyInfo> passkeys = await _userManager.GetPasskeysAsync(user);

        UserPasskeyInfo? passkey = passkeys.SingleOrDefault(p =>
            Convert.ToBase64String(p.CredentialId) == request.Id
        );

        if (passkey is null)
            return NotFound();

        passkey.Name = request.Name;

        IdentityResult result = await _userManager.AddOrUpdatePasskeyAsync(user, passkey);
        return result.Succeeded ? Ok() : BadRequest(result.Errors);
    }

    [HttpDelete("passkeys")]
    [Authorize]
    public async Task<IActionResult> PassKeyDelete([FromBody] PasskeyDeleteRequest request)
    {
        User? user = await _userManager.GetUserAsync(User);
        if (user is null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(request.Id))
            return BadRequest("Invalid passkey id.");

        byte[] credentialId;
        try
        {
            credentialId = Convert.FromBase64String(request.Id);
        }
        catch (FormatException)
        {
            return BadRequest("Invalid passkey id.");
        }

        IdentityResult result = await _userManager.RemovePasskeyAsync(user, credentialId);
        return result.Succeeded ? Ok() : BadRequest(result.Errors);
    }
}

public sealed class PasskeyDto
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required List<string> Transports { get; init; }
    public required string DeviceType { get; init; }
}

public class PasskeyEditRequest
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class PasskeyDeleteRequest
{
    public string Id { get; set; } = string.Empty;
}
