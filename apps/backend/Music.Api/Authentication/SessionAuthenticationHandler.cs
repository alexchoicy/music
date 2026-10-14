using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Music.Core.Common.Constants;
using Music.Core.Services.Auth;

namespace Music.Api.Authentication;

public sealed class SessionAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    ISessionService sessionService,
    SessionCookie sessionCookie
) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Session";
    private const string BearerPrefix = "Bearer ";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        string? token = null;
        bool fromCookie = false;

        string? authorization = Request.Headers.Authorization;
        if (authorization?.StartsWith(BearerPrefix, StringComparison.OrdinalIgnoreCase) == true)
        {
            token = authorization[BearerPrefix.Length..].Trim();
        }
        else if (Request.Cookies.TryGetValue(sessionCookie.Name, out string? cookieToken))
        {
            token = cookieToken;
            fromCookie = true;
        }

        if (string.IsNullOrEmpty(token))
        {
            return AuthenticateResult.NoResult();
        }

        AuthenticatedSession? session = await sessionService.AuthenticateAsync(
            token,
            Context.RequestAborted
        );
        if (session is null)
        {
            return AuthenticateResult.Fail("Session is invalid, expired, or revoked.");
        }

        if (fromCookie && session.Renewed)
        {
            sessionCookie.Append(Response, token);
        }

        List<Claim> claims =
        [
            new(ClaimTypes.NameIdentifier, session.UserId),
            new(ClaimTypes.Name, session.UserName),
            new(AuthClaimNames.SessionId, session.Id.ToString()),
            new(AuthClaimNames.AccessType, session.TokenType.ToString()),
        ];
        claims.AddRange(session.Roles.Select(role => new Claim(ClaimTypes.Role, role)));

        ClaimsPrincipal principal = new(new ClaimsIdentity(claims, SchemeName));
        return AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName));
    }
}
