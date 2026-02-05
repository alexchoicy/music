using Microsoft.EntityFrameworkCore;
using Music.Core.Models;
using Music.Core.Services.Interfaces;
using Music.Core.Utils;
using Music.Infrastructure.Data;
using Music.Core.Entities;

namespace Music.Infrastructure.Services.Party;

public class PartyService(AppDbContext dbContext) : IPartyService
{
    private readonly AppDbContext _dbContext = dbContext;

    public async Task<bool> CreatePartyAsync(CreatePartyModel request, string userId)
    {
        Core.Entities.Party party = new()
        {
            Name = request.Name,
            Type = request.PartyType,
            LanguageId = request.LanguageId == 0 ? null : (int?)request.LanguageId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.Parties.Add(party);

        int changes = await _dbContext.SaveChangesAsync();

        return changes > 0;
    }

    public async Task<IReadOnlyList<PartyListModel>> GetAllForListAsync(PartyListParams partyListParams)
    {
        IQueryable<Core.Entities.Party> baseQuery = _dbContext.Parties.AsNoTracking();

        if (!string.IsNullOrEmpty(partyListParams.Search))
        {
            string serachNormalized = StringUtils.NormalizeString(partyListParams.Search);
            baseQuery = baseQuery.Where(p => p.NormalizedName.Contains(serachNormalized) ||
                                             p.Aliases.Any(a => a.NormalizedName.Contains(serachNormalized)));
        }

        List<PartyListModel> parties = await baseQuery
            .Select(p => new PartyListModel
            {
                PartyId = p.Id,
                PartyName = p.Name,
                PartyNormalizedName = p.NormalizedName,
                PartyAliases = p.Aliases.Select(a => new PartyAliasModel
                {
                    AliasName = a.Name,
                    AliasNormalizedName = a.NormalizedName
                }).ToList()
            })
            .ToListAsync();

        return parties;
    }

}
