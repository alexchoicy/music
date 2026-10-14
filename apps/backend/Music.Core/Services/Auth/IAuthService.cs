using Music.Core.Services.Auth.Enums;

namespace Music.Core.Services.Auth;

public interface IAuthService
{
    Task<List<UserInfo>> GetUsersAsync();
    Task<UserInfo?> GetUserAsync(string id);

    Task<UserInfo?> PasswordSignInAsync(string userName, string password);
    Task<UserInfo?> PasskeySignInAsync(string credentialJson);
    Task<UserInfo> CreateUserAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken = default
    );
    Task<UserInfo> UpdateUserAsync(
        string id,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default
    );
}
