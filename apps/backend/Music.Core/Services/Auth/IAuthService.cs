using Music.Core.Services.Auth.Enums;

namespace Music.Core.Services.Auth;

public interface IAuthService
{
    Task<List<UserInfo>> GetUsersAsync();
    Task<LoginResult?> LoginAsync(string emailOrUserName, string password);
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
