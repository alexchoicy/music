using Music.Core.Services.Parties.Results;
using Music.Core.Services.Parties.Requests;

namespace Music.Core.Services.Parties;

public interface IPartyService
{
    Task<bool> UpdateAliasesAsync(int partyId, PartyAliasBatchRequest request, string userId, CancellationToken cancellationToken = default);
    Task<bool> UpdateExternalInfosAsync(int partyId, PartyExternalInfoBatchRequest request, string userId, CancellationToken cancellationToken = default);
    Task<UpdatePartyResult?> UpdateImagesAsync(int partyId, PartyImageBatchRequest request, string userId, CancellationToken cancellationToken = default);

    Task<UpdatePartyResult?> UpdatePartyAsync(
        int partyId,
        UpdatePartyRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );

    Task<int> CreatePartyAsync(
        CreatePartyRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );

    Task<IList<PartyItems>> GetAllAsync(
        PartyListRequest request,
        CancellationToken cancellationToken = default
    );

    Task<PartyDetails?> GetPartyByIdAsync(
        int partyId,
        CancellationToken cancellationToken = default
    );
}
