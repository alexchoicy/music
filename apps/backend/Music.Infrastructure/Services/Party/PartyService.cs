using Microsoft.EntityFrameworkCore;
using Music.Core.Models;
using Music.Core.Services.Interfaces;
using Music.Core.Utils;
using Music.Infrastructure.Data;
using Music.Core.Entities;
using Music.Core.Exceptions;

namespace Music.Infrastructure.Services.Party;

public class PartyService(AppDbContext dbContext, IAssetsService assetsService) : IPartyService
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IAssetsService _assetsService = assetsService;

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

    public async Task<IReadOnlyList<PartyModel>> GetAllPartiesAsync()
    {
        List<PartyModel> parties = await _dbContext.Parties.AsNoTracking()
        .Where(p => p.AlbumCredits.Any())
            .Select(p => new PartyModel
            {
                PartyId = p.Id,
                PartyName = p.Name,
                AvatarImages = p.Images
                    .Where(pi => pi.PartyImageType == Core.Enums.PartyImageType.Avatar && pi.IsPrimary && pi.File != null)
                    .SelectMany(pi => pi.File!.FileObjects)
                    .Select(fo => new PartyImageModel
                    {
                        Url = _assetsService.GetUrl(fo.StoragePath),
                        Variant = fo.FileObjectVariant
                    }).ToList(),
                Type = p.Type
            })
            .ToListAsync();

        return parties;
    }

    public async Task<PartyDetailModel?> GetPartyByIdAsync(int partyId, CancellationToken cancellationToken)
    {
        Core.Entities.Party? party = await _dbContext.Parties
            .AsSplitQuery()
            .Include(p => p.Aliases)
            .Include(p => p.Language)
            .Include(p => p.Images)
            .ThenInclude(pi => pi.File)
            .ThenInclude(f => f!.FileObjects)
            .Include(p => p.AlbumCredits)
            .ThenInclude(ac => ac.Album)
            .ThenInclude(a => a!.Discs)
            .ThenInclude(d => d.Tracks)
            .ThenInclude(at => at.Track)
            .Include(p => p.AlbumCredits)
            .ThenInclude(ac => ac.Album)
            .ThenInclude(a => a!.Credits)
            .ThenInclude(ac => ac.Party)
            .Include(p => p.AlbumCredits)
            .ThenInclude(ac => ac.Album)
            .ThenInclude(a => a!.Images)
            .ThenInclude(ai => ai.File)
            .ThenInclude(f => f!.FileObjects)
            .Include(ac => ac.TrackCredits)
            .ThenInclude(tc => tc.Track)
            .ThenInclude(t => t!.AlbumTracks)
            .ThenInclude(at => at.AlbumDisc)
            .ThenInclude(ad => ad!.Album)
            .ThenInclude(a => a!.Discs)
            .ThenInclude(d => d.Tracks)
            .ThenInclude(at => at.Track)
            .Include(ac => ac.TrackCredits)
            .ThenInclude(tc => tc.Track)
            .ThenInclude(t => t!.AlbumTracks)
            .ThenInclude(at => at.AlbumDisc)
            .ThenInclude(ad => ad!.Album)
            .ThenInclude(a => a!.Credits)
            .ThenInclude(ac => ac.Party)
            .Include(ac => ac.TrackCredits)
            .ThenInclude(tc => tc.Track)
            .ThenInclude(t => t!.AlbumTracks)
            .ThenInclude(at => at.AlbumDisc)
            .ThenInclude(ad => ad!.Album)
            .ThenInclude(a => a!.Images)
            .ThenInclude(ai => ai.File)
            .ThenInclude(f => f!.FileObjects)
            .FirstOrDefaultAsync(p => p.Id == partyId, cancellationToken)
        ?? throw new EntityNotFoundException($"Party with id {partyId} not found.");

        HashSet<int> partyAlbumIds = party.AlbumCredits.Select(a => a.AlbumId).ToHashSet();

        PartyDetailModel partyDetail = new()
        {
            PartyId = party.Id,
            PartyName = party.Name,
            Type = party.Type,
            Language = party.Language == null ? null : new LanguageModel
            {
                LanguageId = party.Language.Id,
                Name = party.Language.Name,
            },
            IconUrl = party.Images.
            FirstOrDefault(i => i.PartyImageType == Core.Enums.PartyImageType.Avatar && i.IsPrimary)?
            .File?.FileObjects.Select(fo => new PartyImageModel
            {
                Url = _assetsService.GetUrl(fo.StoragePath),
                Variant = fo.FileObjectVariant
            }).ToList(),
            BannerUrl = party.Images.
            FirstOrDefault(i => i.PartyImageType == Core.Enums.PartyImageType.Banner && i.IsPrimary)?
            .File?.FileObjects.Select(fo => new PartyImageModel
            {
                Url = _assetsService.GetUrl(fo.StoragePath),
                Variant = fo.FileObjectVariant
            }).ToList(),
            PartyAlbums = party.AlbumCredits
            .Select(ac => ac.Album)
            .Select(album =>
            {
                partyAlbumIds.Add(album!.Id);

                return new AlbumListItemModel
                {
                    AlbumId = album.Id,
                    Title = album.Title,
                    Type = album.Type,
                    ReleaseDate = album.ReleaseDate,
                    CreatedAt = album.CreatedAt,
                    UpdatedAt = album.UpdatedAt,
                    Artists = album.Credits
                    .Select(ac =>
                        new AlbumListArtistModel
                        {
                            PartyId = ac.PartyId,
                            Name = ac.Party!.Name
                        }
                    )
                    .ToList(),
                    TrackCount = album.Discs.Sum(d => d.Tracks.Count),
                    TotalDurationInMs = album.Discs.SelectMany(d => d.Tracks).Sum(t => t.Track?.DurationInMs ?? 0),
                    CoverVariants = album.Images.FirstOrDefault(ai => ai.IsPrimary)?.File?.FileObjects.Select(fo => new AlbumCoverVariantModel
                    {
                        Url = _assetsService.GetUrl(fo.StoragePath),
                        Variant = fo.FileObjectVariant
                    }).ToList() ?? [],
                };
            }).ToList(),
            PartyPartOfAlbums = party.TrackCredits
            .Select(tc => tc.Track)
            .SelectMany(t => t!.AlbumTracks)
            .Select(at => at.AlbumDisc?.Album)
            .Where(a => a!.Id != 0 && !partyAlbumIds.Contains(a.Id))
            .DistinctBy(a => a!.Id)
            .Select(a => new AlbumListItemModel
            {
                AlbumId = a!.Id,
                Title = a.Title,
                Type = a.Type,
                ReleaseDate = a.ReleaseDate,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt,
                Artists = a.Credits
                .Select(ac =>
                {
                    if (ac.Party is null)
                    {
                        return null;
                    }

                    return new AlbumListArtistModel
                    {
                        PartyId = ac.PartyId,
                        Name = ac.Party.Name
                    };
                })
                .OfType<AlbumListArtistModel>()
                .ToList(),
                TrackCount = a.Discs.Sum(d => d.Tracks.Count),
                TotalDurationInMs = a.Discs.SelectMany(d => d.Tracks).Sum(t => t.Track?.DurationInMs ?? 0),
                CoverVariants = a.Images.FirstOrDefault(ai => ai.IsPrimary)?.File?.FileObjects.Select(fo => new AlbumCoverVariantModel
                {
                    Url = _assetsService.GetUrl(fo.StoragePath),
                    Variant = fo.FileObjectVariant
                }).ToList() ?? [],
            }).ToList()
        };

        return partyDetail;
    }
}
