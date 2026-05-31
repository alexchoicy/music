using Music.Core.Services.Auth.Enums;
using System.Security.Claims;

namespace Music.Core.Services.Auth;

public interface ITokenService
{
    Task<string> GenerateUserToken(UserInfo user);
    Task<string> GenerateBotToken(string userId);
    Task<string> GenerateUploadToken(string userId);
    Task RevokeTokenAsync(string? jti, CancellationToken cancellationToken = default);
    Task<bool> ValidateTokenAsync(
        ClaimsPrincipal principal,
        CancellationToken cancellationToken = default
    );
}
