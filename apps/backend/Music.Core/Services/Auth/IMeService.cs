using Music.Core.Services.Auth.Enums;
namespace Music.Core.Services.Auth;

public interface IMeService
{
    Task<UserInfo?> GetCurrentUserAsync(
        string userId,
        CancellationToken cancellationToken = default
    );
}
