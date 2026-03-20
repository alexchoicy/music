using System.Security.Claims;
using Music.Core.Entities;
using Music.Core.Models;

namespace Music.Core.Services.Interfaces
{
    public interface ITokenService
    {
        Task<string> GenerateUserToken(UserInfo user, IList<string> roles);
        Task<string> GenerateBotToken(string userId);
        Task<string> GenerateUploadToken(string userId);
        Task RevokeTokenAsync(string? jti, CancellationToken cancellationToken = default);
        Task<bool> ValidateTokenAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default);
    }
}
