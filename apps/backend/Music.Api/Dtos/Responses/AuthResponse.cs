namespace Music.Api.Dtos.Responses;

public sealed class UserDto
{
    public required string Id { get; init; }
    public required string UserName { get; init; } = string.Empty;
    public required IList<string> Roles { get; init; } = [];
}

public sealed class LoginResponse
{
    public required string Token { get; init; } = string.Empty;

    public required UserDto User { get; init; }
}
