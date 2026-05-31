using Music.Core.Domain.Auth.Enums;

namespace Music.Core.Domain.Auth;

public sealed class LoginRequest
{
    public required string Username { get; init; }
    public required string Password { get; init; }
}

public sealed class CreateUserRequest
{
    public required string Username { get; init; }
    public required string Password { get; init; }
    public required Roles Role { get; init; }
}

public sealed class UserInfo
{
    public required string Id { get; init; }
    public required string UserName { get; init; } = string.Empty;
    public required IReadOnlyList<string> Roles { get; init; } = [];
}

public sealed class LoginResult
{
    public required string Token { get; init; } = string.Empty;
    public required UserInfo User { get; init; }
}
