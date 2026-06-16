using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Music.Core.Services.Images.Enums;
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
)
    : IPartyService
{
    public async Task<int> CreatePartyAsync(
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
            Gender = request.Gender,
            Country = request.Country,
            MusicBrainzId = request.MusicBrainzID,
            Description = "",
        };

        dbContext.Parties.Add(party);
        await dbContext.SaveChangesAsync(cancellationToken);

        await backgroundTaskQueue.QueueWorkerAsync(
            new PartyInfoEnrichmentWorker { PartyId = party.Id },
            cancellationToken
        );

        return party.Id;
    }

    public async Task<IList<PartyItems>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        List<Core.Entities.Party> parties = await dbContext
            .Parties.AsNoTracking()
            .AsSplitQuery()
            .Include(p => p.Aliases)
            .Include(p => p.Images)
                .ThenInclude(i => i.File)
                    .ThenInclude(f => f!.FileObjects)
            .ToListAsync(cancellationToken);

        return parties
            .Select(p => new PartyItems
            {
                PartyId = p.Id,
                Name = p.Name,
                NormalizedName = p.NormalizedName,
                CoverUrl = GetCoverUrl(p),
                Country = p.Country,
                Type = p.Type,
                Kind = p.Kind,
                Gender = p.Gender,
                Aliases = p
                    .Aliases.Select(a => new PartyAlias
                    {
                        Name = a.Name,
                        NormalizedName = a.NormalizedName,
                    })
                    .ToList(),
            })
            .ToList();
    }

    private string GetCoverUrl(Core.Entities.Party party)
    {
        Core.Entities.FileObject? fileObject = party
            .Images.Where(image => image.ImageRole == ImageRole.Avatar && image.IsPrimary)
            .OrderBy(image => image.CreatedAt)
            .SelectMany(image => image.File?.FileObjects ?? [])
            .OrderBy(fileObject => fileObject.FileObjectVariant)
            .FirstOrDefault();

        return fileObject is null ? string.Empty : assetsService.GetUrl(fileObject.StoragePath);
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
