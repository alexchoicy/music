using Music.Core.Enums;

namespace Music.Core.Entities;

public class AuthToken
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Jti { get; set; }

    public required string Last5Digit { get; set; }
    public required TokenUseType TokenType { get; set; }
    public string? CreatedByUserId { get; set; }
    public required string Name { get; set; } = "";

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public DateTimeOffset? LastUsedAt { get; set; }
}
