namespace Music.Core.Models;

public sealed class UserInfo
{
    public required string Id { get; init; }

    public required string UserName { get; init; } = string.Empty;

    public required IList<string> Roles { get; init; } = [];
}

public sealed class AuthSession
{
    public required string Token { get; init; } = string.Empty;

    public required UserInfo User { get; init; }
}
