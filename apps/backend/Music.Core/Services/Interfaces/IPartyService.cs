using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IPartyService
{
    Task<bool> CreatePartyAsync(CreatePartyModel request, string userId);
    Task<IReadOnlyList<PartyListModel>> GetAllForListAsync(PartyListParams partyListParams);
}
