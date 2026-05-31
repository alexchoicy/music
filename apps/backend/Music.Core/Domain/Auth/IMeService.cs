namespace Music.Core.Domain.Auth;

public interface IMeService
{
    Task<UserInfo?> GetCurrentUserAsync(
        string userId,
        CancellationToken cancellationToken = default
    );
}
