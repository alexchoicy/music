using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Music.Api.Authentication;
using Music.Core.Common.Constants;
using Music.Core.Services.Auth;
using Music.Core.Services.Auth.Enums;
using Music.Infrastructure.Entities;

namespace Music.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(
    IAuthService authService,
    ISessionService sessionService,
    SessionCookie sessionCookie,
    UserManager<User> userManager,
    SignInManager<User> signInManager
) : ControllerBase
{
    private readonly IAuthService _authService = authService;
    private readonly ISessionService _sessionService = sessionService;
    private readonly SessionCookie _sessionCookie = sessionCookie;
    private readonly UserManager<User> _userManager = userManager;
    private readonly SignInManager<User> _signInManager = signInManager;

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResult>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken
    )
    {
        UserInfo? user = await _authService.PasswordSignInAsync(request.Username, request.Password);

        if (user is null)
        {
            return InvalidCredentials("Invalid username or password.");
        }

        return Ok(
            await StartSessionAsync(user, request.Client, request.DeviceName, cancellationToken)
        );
    }

    [HttpGet]
    [Authorize]
    public ActionResult<string> GetProtectedResource()
    {
        return Ok();
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        if (
            User.FindFirstValue(ClaimTypes.NameIdentifier) is { } userId
            && GetSessionId() is { } sessionId
            && Enum.TryParse(
                User.FindFirstValue(AuthClaimNames.AccessType),
                out TokenUseType tokenType
            )
        )
        {
            await _sessionService.RevokeAsync(userId, sessionId, tokenType, cancellationToken);
        }

        _sessionCookie.Delete(Response);
        return Ok();
    }

    [HttpGet("sessions")]
    [Authorize]
    [ProducesResponseType(typeof(List<AuthSessionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<AuthSessionDto>>> Sessions(
        CancellationToken cancellationToken
    )
    {
        return Ok(
            await _sessionService.GetUserSessionsAsync(
                GetUserId(),
                GetSessionId(),
                cancellationToken
            )
        );
    }

    [HttpDelete("sessions/{id:guid}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RevokeSession(
        [FromRoute] Guid id,
        CancellationToken cancellationToken
    )
    {
        if (
            !await _sessionService.RevokeAsync(
                GetUserId(),
                id,
                TokenUseType.UserAccess,
                cancellationToken
            )
        )
        {
            return NotFound();
        }

        if (id == GetSessionId())
        {
            _sessionCookie.Delete(Response);
        }

        return NoContent();
    }

    [HttpGet("api-keys")]
    [Authorize(Policy = AuthorizationPolicies.RequireAdminRole)]
    [ProducesResponseType(typeof(List<ApiKeyDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ApiKeyDto>>> ApiKeys(CancellationToken cancellationToken)
    {
        return Ok(await _sessionService.GetApiKeysAsync(GetUserId(), cancellationToken));
    }

    [HttpPost("api-keys")]
    [Authorize(Policy = AuthorizationPolicies.RequireAdminRole)]
    [ProducesResponseType(typeof(CreatedApiKey), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreatedApiKey>> CreateApiKey(
        [FromBody] CreateApiKeyRequest request,
        CancellationToken cancellationToken
    )
    {
        return Ok(
            await _sessionService.CreateApiKeyAsync(GetUserId(), request.Name, cancellationToken)
        );
    }

    [HttpDelete("api-keys/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.RequireAdminRole)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RevokeApiKey(
        [FromRoute] Guid id,
        CancellationToken cancellationToken
    )
    {
        return await _sessionService.RevokeAsync(
            GetUserId(),
            id,
            TokenUseType.Machine,
            cancellationToken
        )
            ? NoContent()
            : NotFound();
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
    public async Task<ActionResult<LoginResult>> PassKeySignIn(
        [FromBody] PasskeySignInRequest request,
        CancellationToken cancellationToken
    )
    {
        UserInfo? user = await _authService.PasskeySignInAsync(request.Credential.GetRawText());
        if (user is null)
        {
            return InvalidCredentials("Passkey sign-in failed.");
        }

        return Ok(
            await StartSessionAsync(user, request.Client, request.DeviceName, cancellationToken)
        );
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
                Transports = result.Passkey.Transports?.ToList() ?? [],
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
                Transports = p.Transports?.ToList() ?? [],
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

    private async Task<LoginResult> StartSessionAsync(
        UserInfo user,
        AuthClient client,
        string? deviceName,
        CancellationToken cancellationToken
    )
    {
        string name = string.IsNullOrWhiteSpace(deviceName)
            ? Request.Headers.UserAgent.ToString()
            : deviceName;
        if (string.IsNullOrWhiteSpace(name))
        {
            name = client.ToString();
        }

        IssuedSession session = await _sessionService.CreateUserSessionAsync(
            user.Id,
            client,
            name,
            GetClientIpAddress(),
            cancellationToken
        );

        if (client == AuthClient.App)
        {
            return new LoginResult { Token = session.Token, User = user };
        }

        _sessionCookie.Append(Response, session.Token);
        return new LoginResult { User = user };
    }

    private ObjectResult InvalidCredentials(string detail) =>
        Problem(
            title: "InvalidCredentials",
            detail: detail,
            statusCode: StatusCodes.Status401Unauthorized
        );

    private string? GetClientIpAddress()
    {
        IPAddress? address = HttpContext.Connection.RemoteIpAddress;
        return address is { IsIPv4MappedToIPv6: true }
            ? address.MapToIPv4().ToString()
            : address?.ToString();
    }

    private string GetUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new ValidationException("Missing user identifier claim.");

    private Guid? GetSessionId() =>
        Guid.TryParse(User.FindFirstValue(AuthClaimNames.SessionId), out Guid id) ? id : null;
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
