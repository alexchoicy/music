using Music.Core.Services.Parties.Enums;

namespace Music.Core.Services.Parties.Results;

public sealed record CreatePartyRelationshipResult
{
    public required int SourcePartyId { get; init; }
    public required int TargetPartyId { get; init; }
    public required PartyRelationshipType Type { get; init; }
}
