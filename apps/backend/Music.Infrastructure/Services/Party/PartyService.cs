using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Music.Core.Services.Parties;
using Music.Core.Services.Parties.Requests;
using Music.Core.Storage;
using Music.Core.Workers;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Party;

public class PartyService(
    AppDbContext dbContext,
    IAssetsService assetsService,
    IBackgroundTaskQueue backgroundTaskQueue,
    ILogger<PartyService> logger
) : IPartyService
{
    public Task<bool> CreatePartyAsync(
        CreatePartyRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        throw new NotImplementedException();
    }

    public async Task<IList<PartyItems>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext
            .Parties.AsNoTracking()
            .Select(p => new PartyItems
            {
                PartyId = p.Id,
                Name = p.Name,
                NormalizedName = p.NormalizedName,
                Aliases = p
                    .Aliases.Select(a => new PartyAlias
                    {
                        Name = a.Name,
                        NormalizedName = a.NormalizedName,
                    })
                    .ToList(),
            })
            .ToListAsync(cancellationToken);
    }

    public Task<IReadOnlyList<PartySummary>> GetAllPartiesAsync(
        CancellationToken cancellationToken = default
    )
    {
        throw new NotImplementedException();
    }

    public Task<PartyDetails?> GetPartyByIdAsync(
        int partyId,
        CancellationToken cancellationToken = default
    )
    {
        throw new NotImplementedException();
    }
}
