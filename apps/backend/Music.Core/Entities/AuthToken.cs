using Music.Core.Services.Auth.Enums;

namespace Music.Core.Entities;

public class AuthToken
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required byte[] TokenHash { get; set; }

    public required TokenUseType TokenType { get; set; }
    public AuthClient? Client { get; set; }
    public required string CreatedByUserId { get; set; }
    public required string Name { get; set; } = "";

    public string? IpAddress { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public DateTimeOffset? LastUsedAt { get; set; }
}
