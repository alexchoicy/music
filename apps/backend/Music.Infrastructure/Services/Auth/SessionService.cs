using System.Buffers.Text;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Music.Core.Entities;
using Music.Core.Services.Auth;
using Music.Core.Services.Auth.Enums;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Auth;

public class SessionService(AppDbContext dbContext) : ISessionService
{
    private static readonly TimeSpan IdleTimeout = TimeSpan.FromDays(30);

    private static readonly TimeSpan RenewInterval = TimeSpan.FromMinutes(10);

    private const int TokenBytes = 32;
    private const int MaxNameLength = 128;

    private readonly AppDbContext _dbContext = dbContext;

    public async Task<IssuedSession> CreateUserSessionAsync(
        string userId,
        AuthClient client,
        string name,
        string? ipAddress,
        CancellationToken cancellationToken = default
    )
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        string token = GenerateToken();
        AuthToken session = new()
        {
            TokenHash = Hash(token),
            TokenType = TokenUseType.UserAccess,
            Client = client,
            CreatedByUserId = userId,
            Name = TrimName(name),
            IpAddress = ipAddress,
            CreatedAt = now,
            LastUsedAt = now,
            ExpiresAt = now + IdleTimeout,
        };

        _dbContext.AuthTokens.Add(session);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new IssuedSession { Id = session.Id, Token = token };
    }

    public async Task<CreatedApiKey> CreateApiKeyAsync(
        string userId,
        string name,
        CancellationToken cancellationToken = default
    )
    {
        string trimmedName = TrimName(name);
        if (trimmedName.Length == 0)
        {
            throw new ValidationException("API key name is required.");
        }

        string token = GenerateToken();
        AuthToken apiKey = new()
        {
            TokenHash = Hash(token),
            TokenType = TokenUseType.Machine,
            CreatedByUserId = userId,
            Name = trimmedName,
        };
        _dbContext.AuthTokens.Add(apiKey);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new CreatedApiKey
        {
            Key = new ApiKeyDto
            {
                Id = apiKey.Id,
                Name = apiKey.Name,
                CreatedAt = apiKey.CreatedAt,
                LastUsedAt = apiKey.LastUsedAt,
            },
            Token = token,
        };
    }

    public async Task<AuthenticatedSession?> AuthenticateAsync(
        string token,
        CancellationToken cancellationToken = default
    )
    {
        byte[] hash = Hash(token);
        DateTimeOffset now = DateTimeOffset.UtcNow;

        var session = await _dbContext
            .AuthTokens.Where(session =>
                session.TokenHash == hash
                && session.RevokedAt == null
                && (session.ExpiresAt == null || session.ExpiresAt > now)
            )
            .Select(session => new
            {
                session.Id,
                session.CreatedByUserId,
                session.TokenType,
                session.ExpiresAt,
                session.LastUsedAt,
                UserName = _dbContext
                    .Users.Where(user => user.Id == session.CreatedByUserId)
                    .Select(user => user.UserName)
                    .FirstOrDefault(),
                Roles = _dbContext
                    .UserRoles.Where(userRole => userRole.UserId == session.CreatedByUserId)
                    .Join(
                        _dbContext.Roles,
                        userRole => userRole.RoleId,
                        role => role.Id,
                        (userRole, role) => role.Name!
                    )
                    .ToList(),
            })
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken);

        if (session is null)
        {
            return null;
        }

        DateTimeOffset? expiresAt = session.ExpiresAt;
        bool renewed = false;
        if (session.LastUsedAt is null || now - session.LastUsedAt >= RenewInterval)
        {
            // API keys record use but never expire.
            if (session.TokenType == TokenUseType.UserAccess)
            {
                expiresAt = now + IdleTimeout;
                renewed = true;
            }

            await _dbContext
                .AuthTokens.Where(token => token.Id == session.Id)
                .ExecuteUpdateAsync(
                    setters =>
                        setters
                            .SetProperty(token => token.LastUsedAt, now)
                            .SetProperty(token => token.ExpiresAt, expiresAt),
                    cancellationToken
                );
        }

        return new AuthenticatedSession
        {
            Id = session.Id,
            UserId = session.CreatedByUserId,
            UserName = session.UserName ?? string.Empty,
            TokenType = session.TokenType,
            // API keys act for the user without the user's roles.
            Roles = session.TokenType == TokenUseType.UserAccess ? session.Roles : [],
            Renewed = renewed,
        };
    }

    public Task<bool> IsActiveAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        return _dbContext.AuthTokens.AnyAsync(
            session =>
                session.Id == sessionId
                && session.RevokedAt == null
                && (session.ExpiresAt == null || session.ExpiresAt > now),
            cancellationToken
        );
    }

    public async Task<List<AuthSessionDto>> GetUserSessionsAsync(
        string userId,
        Guid? currentSessionId,
        CancellationToken cancellationToken = default
    )
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        return await _dbContext
            .AuthTokens.Where(session =>
                session.CreatedByUserId == userId
                && session.TokenType == TokenUseType.UserAccess
                && session.RevokedAt == null
                && session.ExpiresAt > now
            )
            .OrderByDescending(session => session.LastUsedAt)
            .Select(session => new AuthSessionDto
            {
                Id = session.Id,
                Name = session.Name,
                Client = session.Client,
                IpAddress = session.IpAddress,
                CreatedAt = session.CreatedAt,
                ExpiresAt = session.ExpiresAt,
                LastUsedAt = session.LastUsedAt,
                IsCurrent = session.Id == currentSessionId,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<List<ApiKeyDto>> GetApiKeysAsync(
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .AuthTokens.Where(apiKey =>
                apiKey.CreatedByUserId == userId
                && apiKey.TokenType == TokenUseType.Machine
                && apiKey.RevokedAt == null
            )
            .OrderByDescending(apiKey => apiKey.CreatedAt)
            .Select(apiKey => new ApiKeyDto
            {
                Id = apiKey.Id,
                Name = apiKey.Name,
                CreatedAt = apiKey.CreatedAt,
                LastUsedAt = apiKey.LastUsedAt,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> RevokeAsync(
        string userId,
        Guid id,
        TokenUseType tokenType,
        CancellationToken cancellationToken = default
    )
    {
        int revoked = await _dbContext
            .AuthTokens.Where(token =>
                token.Id == id
                && token.CreatedByUserId == userId
                && token.TokenType == tokenType
                && token.RevokedAt == null
            )
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(token => token.RevokedAt, DateTimeOffset.UtcNow),
                cancellationToken
            );

        return revoked > 0;
    }

    public async Task RevokeUserSessionsAsync(
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        await _dbContext
            .AuthTokens.Where(session =>
                session.CreatedByUserId == userId
                && session.TokenType == TokenUseType.UserAccess
                && session.RevokedAt == null
            )
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(session => session.RevokedAt, DateTimeOffset.UtcNow),
                cancellationToken
            );
    }

    private static string GenerateToken() =>
        Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(TokenBytes));

    private static byte[] Hash(string token) => SHA256.HashData(Encoding.UTF8.GetBytes(token));

    private static string TrimName(string name)
    {
        string trimmed = name.Trim();
        return trimmed.Length <= MaxNameLength ? trimmed : trimmed[..MaxNameLength];
    }
}
