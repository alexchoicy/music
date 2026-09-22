using Music.Core.Services.Parties.Enums;

namespace Music.Core.Entities;

public class PartyMembership
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public required int PartyId { get; set; }
    public Party? Party { get; set; }

    public required int MemberId { get; set; }
    public Party? Member { get; set; }

    public required PartyRelationshipType Type { get; set; }
}
