using Music.Core.Services.Parties.Requests;
using Music.Core.Services.Parties.Results;

namespace Music.Core.Services.Parties;

public interface IPartyRelationshipService
{
    Task<PartyRelationshipGraph> GetGraphAsync(
        int partyId,
        CancellationToken cancellationToken = default
    );

    Task<CreatePartyRelationshipResult> CreateRelationshipAsync(
        int sourcePartyId,
        CreatePartyRelationshipRequest request,
        CancellationToken cancellationToken = default
    );

    Task DeleteRelationshipAsync(
        Guid relationshipId,
        CancellationToken cancellationToken = default
    );
}
