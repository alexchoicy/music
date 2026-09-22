using Music.Core.Services.Parties.Enums;

namespace Music.Core.Services.Parties;

public sealed class PartyRelationshipGraph
{
    public required int FocusPartyId { get; init; }
    public required IReadOnlyList<PartySummary> Parties { get; init; }
    public required IReadOnlyList<PartyRelationshipDetails> Relationships { get; init; }
}

public sealed record PartyRelationshipDetails
{
    public required Guid RelationshipId { get; init; }
    public required int SourcePartyId { get; init; }
    public required int TargetPartyId { get; init; }
    public required PartyRelationshipType Type { get; init; }
}
