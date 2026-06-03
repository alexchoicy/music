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
    public async Task<bool> CreatePartyAsync(
        CreatePartyRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        Core.Entities.Party party = new()
        {
            Name = request.Name,
            Type = request.Type,
            Kind = request.Kind,
            Country = request.Country,
            MusicBrainzId = request.MusicBrainzID,
        };

        dbContext.Parties.Add(party);
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
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
                Country = p.Country,
                Type = p.Type,
                Kind = p.Kind,
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
