using Music.Core.Services.Auth.Enums;

namespace Music.Core.Services.Auth;

public interface ISessionService
{
    Task<IssuedSession> CreateUserSessionAsync(
        string userId,
        AuthClient client,
        string name,
        string? ipAddress,
        CancellationToken cancellationToken = default
    );
    Task<CreatedApiKey> CreateApiKeyAsync(
        string userId,
        string name,
        CancellationToken cancellationToken = default
    );

    Task<AuthenticatedSession?> AuthenticateAsync(
        string token,
        CancellationToken cancellationToken = default
    );
    Task<bool> IsActiveAsync(Guid sessionId, CancellationToken cancellationToken = default);

    Task<List<AuthSessionDto>> GetUserSessionsAsync(
        string userId,
        Guid? currentSessionId,
        CancellationToken cancellationToken = default
    );
    Task<List<ApiKeyDto>> GetApiKeysAsync(
        string userId,
        CancellationToken cancellationToken = default
    );

    Task<bool> RevokeAsync(
        string userId,
        Guid id,
        TokenUseType tokenType,
        CancellationToken cancellationToken = default
    );
    Task RevokeUserSessionsAsync(string userId, CancellationToken cancellationToken = default);
}
