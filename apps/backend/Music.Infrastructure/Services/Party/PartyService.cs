using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Music.Core.Common.Enums;
using Music.Core.Services.Images.Enums;
using Music.Core.Services.Parties;
using Music.Core.Services.Parties.Enums;
using Music.Core.Services.Parties.Requests;
using Music.Core.Storage;
using Music.Core.Workers;
using Music.Infrastructure.Data;
using Music.Infrastructure.Mappers;

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
            .Include(p => p.AlbumCredits)
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
                AlbumCount = p.AlbumCredits.Count(credit => credit.Credit == CreditType.Artist),
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

    public async Task<PartyDetails?> GetPartyByIdAsync(
        int partyId,
        CancellationToken cancellationToken = default
    )
    {
        Core.Entities.Party? party = await dbContext
            .Parties.AsNoTracking()
            .AsSplitQuery()
            .Include(p => p.Aliases)
            .Include(p => p.PartyExternalInfos)
            .Include(p => p.Images)
                .ThenInclude(i => i.File)
                    .ThenInclude(f => f!.FileObjects)
            .FirstOrDefaultAsync(p => p.Id == partyId, cancellationToken);

        if (party is null)
        {
            return null;
        }

        List<Core.Entities.Album> albums = await IncludeAlbumListData(
                dbContext.Albums.AsNoTracking()
            )
            .Where(album =>
                album.Credits.Any(credit =>
                    credit.PartyId == partyId && credit.Credit == CreditType.Artist
                )
            )
            .OrderByDescending(album => album.CreatedAt)
            .ToListAsync(cancellationToken);

        List<Core.Entities.Album> appearsOnAlbums = await IncludeAlbumListData(
                dbContext.Albums.AsNoTracking()
            )
            .Where(album =>
                !album.Credits.Any(credit =>
                    credit.PartyId == partyId && credit.Credit == CreditType.Artist
                )
                && album.Discs.Any(disc =>
                    disc.Tracks.Any(albumTrack =>
                        albumTrack.Track!.Credits.Any(credit =>
                            credit.PartyId == partyId && credit.Credit == CreditType.Artist
                        )
                    )
                )
            )
            .OrderByDescending(album => album.CreatedAt)
            .ToListAsync(cancellationToken);

        return new PartyDetails
        {
            PartyId = party.Id,
            Name = party.Name,
            AvatarImages = party.ToPrimaryAvatarImages(assetsService),
            Country = party.Country,
            Description = party.Description,
            Type = party.Type,
            Kind = party.Kind,
            Gender = party.Gender,
            Aliases = party
                .Aliases.Where(alias => alias.DeletedAt is null)
                .OrderBy(alias => alias.Name)
                .Select(alias => new PartyAlias
                {
                    Name = alias.Name,
                    NormalizedName = alias.NormalizedName,
                })
                .ToList(),
            ExternalInfoLinks = party
                .PartyExternalInfos.OrderBy(externalInfo => externalInfo.Type)
                .Select(externalInfo => new PartyExternalInfoLink
                {
                    Type = externalInfo.Type,
                    Url = BuildExternalInfoUrl(externalInfo.Type, externalInfo.ExternalId),
                })
                .ToList(),
            Albums = albums.Select(album => album.ToListItem(assetsService)).ToList(),
            AppearsOnAlbums = appearsOnAlbums
                .Select(album => album.ToListItem(assetsService))
                .ToList(),
        };
    }

    private static IQueryable<Core.Entities.Album> IncludeAlbumListData(
        IQueryable<Core.Entities.Album> query
    )
    {
        return query
            .AsSplitQuery()
            .Include(album => album.Credits)
                .ThenInclude(credit => credit.Party)
            .Include(album => album.Discs)
                .ThenInclude(disc => disc.Tracks)
                    .ThenInclude(albumTrack => albumTrack.Track)
            .Include(album => album.Images)
                .ThenInclude(image => image.File)
                    .ThenInclude(file => file!.FileObjects);
    }

    private static string BuildExternalInfoUrl(PartyExternalInfoType type, string externalId)
    {
        string value = externalId.Trim();

        if (Uri.TryCreate(value, UriKind.Absolute, out Uri? uri))
        {
            return uri.ToString();
        }

        return type switch
        {
            PartyExternalInfoType.Spotify => $"https://open.spotify.com/artist/{EscapePathSegment(value)}",
            PartyExternalInfoType.Twitter => $"https://x.com/{EscapePathSegment(value.TrimStart('@'))}",
            PartyExternalInfoType.OfficialWebsite => value,
            PartyExternalInfoType.YouTube => BuildYouTubeUrl(value),
            PartyExternalInfoType.YouTubeMusic => BuildYouTubeMusicUrl(value),
            PartyExternalInfoType.Instagram => $"https://www.instagram.com/{EscapePathSegment(value.TrimStart('@'))}",
            PartyExternalInfoType.AppleMusic => $"https://music.apple.com/artist/{EscapePathSegment(value)}",
            PartyExternalInfoType.Mora => $"https://mora.jp/artist/{EscapePathSegment(value)}/",
            PartyExternalInfoType.Ototoy => $"https://ototoy.jp/_/default/a/{EscapePathSegment(value)}",
            _ => value,
        };
    }

    private static string BuildYouTubeUrl(string value)
    {
        if (value.StartsWith('@'))
        {
            return $"https://www.youtube.com/{value}";
        }

        if (value.StartsWith("UC", StringComparison.Ordinal))
        {
            return $"https://www.youtube.com/channel/{EscapePathSegment(value)}";
        }

        return $"https://www.youtube.com/{EscapePathSegment(value)}";
    }

    private static string BuildYouTubeMusicUrl(string value)
    {
        if (value.StartsWith('@'))
        {
            return $"https://music.youtube.com/{value}";
        }

        return $"https://music.youtube.com/channel/{EscapePathSegment(value)}";
    }

    private static string EscapePathSegment(string value)
    {
        return Uri.EscapeDataString(value);
    }
}
