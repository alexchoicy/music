using Music.Core.Services.Parties.Enums;
using Music.Core.Services.Parties.Requests;

namespace Music.Core.Services.Parties;

public interface IPartyService
{
    Task<bool> CreatePartyAsync(
        CreatePartyRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );

    Task<IList<PartyItems>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PartySummary>> GetAllPartiesAsync(
        CancellationToken cancellationToken = default
    );

    Task<PartyDetails?> GetPartyByIdAsync(
        int partyId,
        CancellationToken cancellationToken = default
    );
}
