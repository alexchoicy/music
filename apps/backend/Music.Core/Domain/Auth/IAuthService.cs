namespace Music.Core.Domain.Auth;

public interface IAuthService
{
    Task<LoginResult?> LoginAsync(string emailOrUserName, string password);
    Task<UserInfo> CreateUserAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken = default
    );
}
