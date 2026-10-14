using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Music.Core.Services.Auth.Enums;

namespace Music.Core.Services.Auth;

public sealed class LoginRequest
{
    public required string Username { get; init; }
    public required string Password { get; init; }

    [EnumDataType(typeof(AuthClient))]
    public required AuthClient Client { get; init; }

    public string? DeviceName { get; init; }
}

public sealed class PasskeySignInRequest
{
    public required JsonElement Credential { get; init; }

    [EnumDataType(typeof(AuthClient))]
    public required AuthClient Client { get; init; }
    public string? DeviceName { get; init; }
}

public sealed class CreateUserRequest
{
    public required string Username { get; init; }
    public required string Password { get; init; }
    public required Roles Role { get; init; }
}

public sealed class UpdateUserRequest
{
    public string? Username { get; init; }
    public string? Password { get; init; }
    public Roles? Role { get; init; }
}

public sealed class UserInfo
{
    public required string Id { get; init; }
    public required string UserName { get; init; } = string.Empty;
    public required IList<string> Roles { get; init; } = [];
}

public sealed class LoginResult
{
    public string? Token { get; init; }
    public required UserInfo User { get; init; }
}

public sealed class IssuedSession
{
    public required Guid Id { get; init; }
    public required string Token { get; init; }
}

public sealed class AuthenticatedSession
{
    public required Guid Id { get; init; }
    public required string UserId { get; init; }
    public required string UserName { get; init; }
    public required TokenUseType TokenType { get; init; }
    public required IList<string> Roles { get; init; }

    public bool Renewed { get; init; }
}

public sealed class AuthSessionDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required AuthClient? Client { get; init; }
    public required string? IpAddress { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset? ExpiresAt { get; init; }
    public required DateTimeOffset? LastUsedAt { get; init; }
    public required bool IsCurrent { get; init; }
}

public sealed class ApiKeyDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset? LastUsedAt { get; init; }
}

public sealed class CreateApiKeyRequest
{
    public required string Name { get; init; }
}

public sealed class CreatedApiKey
{
    public required ApiKeyDto Key { get; init; }

    // Shown once; only its hash is stored.
    public required string Token { get; init; }
}
