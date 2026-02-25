using Music.Core.Enums;

namespace Music.Core.Entities;

public class PartyAlias
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public string NormalizedName { get; set; } = string.Empty;

    public required int PartyId { get; set; }
    public Party? Party { get; set; }

    public string? Type { get; set; }

    public AliasSourceType SourceType { get; set; } = AliasSourceType.UserCreated;

    public string? CreatedByUserId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? DeletedAt { get; set; } = null;
}
