using System.ComponentModel.DataAnnotations;
using Music.Core.Services.Parties.Enums;

namespace Music.Core.Services.Parties.Requests;

public sealed class CreatePartyRelationshipRequest
{
    [Range(1, int.MaxValue)]
    public required int TargetPartyId { get; init; }

    [EnumDataType(typeof(PartyRelationshipType))]
    public required PartyRelationshipType Type { get; init; }
}
