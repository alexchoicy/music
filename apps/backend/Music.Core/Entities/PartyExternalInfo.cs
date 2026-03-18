using Music.Core.Enums;

namespace Music.Core.Entities;

public class PartyExternalInfo
{
    public int Id { get; set; }

    public required int PartyId { get; set; }
    public Party? Party { get; set; }

    public required PartyExternalInfoType Type { get; set; }
    public required string ExternalIds { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
