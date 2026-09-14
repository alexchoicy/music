using System.ComponentModel.DataAnnotations;
using Music.Core.Options;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Parties.Results;
using Microsoft.EntityFrameworkCore;
using Music.Core.Common.Enums;
using Music.Core.Common.Utils;
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
    IBackgroundTaskQueue backgroundTaskQueue
) : IPartyService
{
    public async Task<UpdatePartyResult?> UpdatePartyAsync(
        int partyId, UpdatePartyRequest request, string userId,
        CancellationToken cancellationToken = default)
    {
        var party = await dbContext.Parties.FirstOrDefaultAsync(p => p.Id == partyId, cancellationToken);
        if (party is null) return null;

        bool musicBrainzChanged = false;
        if (request.Has(nameof(request.MusicBrainzId)))
        {
            string? value = string.IsNullOrWhiteSpace(request.MusicBrainzId)
                ? null : Guid.Parse(request.MusicBrainzId).ToString();
            musicBrainzChanged = !string.Equals(party.MusicBrainzId, value, StringComparison.OrdinalIgnoreCase);
            party.MusicBrainzId = value;
        }
        
        if (request.Has(nameof(request.Name))) party.Name = request.Name!.Trim();
        if (request.Has(nameof(request.Description))) party.Description = request.Description!;
        if (request.Has(nameof(request.Country))) party.Country = request.Country!.Value;
        if (request.Has(nameof(request.DebutDate))) party.DebutDate = request.DebutDate;
        if (request.Has(nameof(request.Type))) party.Type = request.Type!.Value;
        if (request.Has(nameof(request.Kind))) party.Kind = request.Kind!.Value;
        if (request.Has(nameof(request.Gender))) party.Gender = request.Gender!.Value;

        Guid? jobId = musicBrainzChanged
            ? backgroundTaskQueue.StageWorker(new PartyInfoEnrichmentWorker { PartyId = party.Id }, dbContext)
            : null;

        await dbContext.SaveChangesAsync(cancellationToken);

        if (jobId.HasValue) backgroundTaskQueue.NotifyWorker(jobId.Value);
        
        return new UpdatePartyResult { PartyId = party.Id };
    }

    private static void ValidateBatch<T>(PartyBatchRequest<T> request, IEnumerable<int?> updateIds, IEnumerable<int> existingIds)
    {
        var ids = updateIds.Where(id => id.HasValue).Select(id => id!.Value).ToList();

        var existing = existingIds.ToHashSet();

        if (ids.Any(id => id <= 0) || ids.Distinct().Count() != ids.Count || ids.Intersect(request.Delete).Any())
            throw new ValidationException("An ID must appear only once in the batch.");

        if (ids.Concat(request.Delete).Any(id => !existing.Contains(id)))
            throw new ValidationException("An item does not belong to this party.");
    }

    public async Task<bool> UpdateAliasesAsync(int partyId, PartyAliasBatchRequest request, string userId, CancellationToken cancellationToken = default)
    {
        var party = await dbContext.Parties.Include(p => p.Aliases).FirstOrDefaultAsync(p => p.Id == partyId, cancellationToken);
        if (party is null) return false;

        ValidateBatch(request, request.Upsert.Select(x => x.Id), party.Aliases.Select(x => x.Id));

        dbContext.PartyAliases.RemoveRange(party.Aliases.Where(x => request.Delete.Contains(x.Id)));
        foreach (var item in request.Upsert)
        {
            var alias = item.Id.HasValue ? party.Aliases.Single(x => x.Id == item.Id) : new Core.Entities.PartyAlias { PartyId = partyId, Name = item.Name.Trim() };
            if (!item.Id.HasValue) dbContext.PartyAliases.Add(alias);
            alias.Name = item.Name.Trim();
            alias.SourceType = AliasSourceType.UserCreated;
            alias.CreatedByUserId = userId;
            alias.DeletedAt = null;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> UpdateExternalInfosAsync(int partyId, PartyExternalInfoBatchRequest request, string userId, CancellationToken cancellationToken = default)
    {
        var party = await dbContext.Parties.Include(p => p.PartyExternalInfos).FirstOrDefaultAsync(p => p.Id == partyId, cancellationToken);
        if (party is null) return false;

        ValidateBatch(request, request.Upsert.Select(x => x.Id), party.PartyExternalInfos.Select(x => x.Id));

        if (request.Upsert.Any(item => item.Id.HasValue && party.PartyExternalInfos.Single(x => x.Id == item.Id).Type != item.Type))
            throw new ValidationException("An existing external info type cannot be changed.");

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        dbContext.PartyExternalInfos.RemoveRange(party.PartyExternalInfos.Where(x => request.Delete.Contains(x.Id)));

        await dbContext.SaveChangesAsync(cancellationToken);

        foreach (var item in request.Upsert)
        {
            var info = item.Id.HasValue ? party.PartyExternalInfos.Single(x => x.Id == item.Id) : new Core.Entities.PartyExternalInfo { PartyId = partyId, Type = item.Type, ExternalId = item.ExternalId.Trim() };
            if (!item.Id.HasValue) dbContext.PartyExternalInfos.Add(info);
            info.ExternalId = item.ExternalId.Trim();
            info.AddedByUserId = userId;
            info.SourceType = PartyDataSource.UserCreated;
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    public async Task<UpdatePartyResult?> UpdateImagesAsync(int partyId, PartyImageBatchRequest request, string userId, CancellationToken cancellationToken = default)
    {
        var party = await dbContext.Parties.Include(p => p.Images).FirstOrDefaultAsync(p => p.Id == partyId, cancellationToken);
        if (party is null) return null;

        ValidateBatch(request, request.Upsert.Select(x => x.Id), party.Images.Select(x => x.Id));

        var primaryRoles = party.Images.Where(x => x.IsPrimary && !request.Delete.Contains(x.Id) && !request.Upsert.Any(item => item.Id == x.Id))
            .Select(x => x.ImageRole).Concat(request.Upsert.Where(x => x.IsPrimary).Select(x => x.ImageRole)).ToList();

        if (primaryRoles.Distinct().Count() != primaryRoles.Count)
            throw new ValidationException("Only one primary image per role is allowed; explicitly demote or delete the previous primary image.");

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        foreach (var image in party.Images.Where(x => request.Upsert.Any(item => item.Id == x.Id))) image.IsPrimary = false;
        
        dbContext.PartyImages.RemoveRange(party.Images.Where(x => request.Delete.Contains(x.Id)));

        await dbContext.SaveChangesAsync(cancellationToken);

        var uploads = new List<(Core.Entities.PartyImage Image, Guid FileObjectId, string Url)>();
        foreach (var imageRequest in request.Upsert)
        {
            Core.Entities.PartyImage image;

            if (imageRequest.Id.HasValue)
                image = party.Images.Single(x => x.Id == imageRequest.Id);
            else
            {
                var file = imageRequest.File!;
                string path = assetsService.GetStoragePath(MediaFolderOptions.PartyCover, file.Blake3Hash, file.MimeType);
                var (storedFile, fileObject) = assetsService.CreateStoredFileWithObject(
                    file, FileType.Image, path, StorageArea.Assets, FileObjectVariant.Original, userId);
                dbContext.StoredFiles.Add(storedFile);
                dbContext.FileObjects.Add(fileObject);
                image = new Core.Entities.PartyImage
                {
                    PartyId = party.Id,
                    FileId = storedFile.Id,
                    File = storedFile,
                    ImageRole = imageRequest.ImageRole,
                };
                dbContext.PartyImages.Add(image);
                uploads.Add((image, fileObject.Id, assetsService.CreateUploadUrlAsync(path, file.MimeType, cancellationToken)));
            }

            image.ImageRole = imageRequest.ImageRole;
            image.IsPrimary = imageRequest.IsPrimary;
            image.CropX = imageRequest.CroppedArea?.X;
            image.CropY = imageRequest.CroppedArea?.Y;
            image.CropWidth = imageRequest.CroppedArea?.Width;
            image.CropHeight = imageRequest.CroppedArea?.Height;
            image.AddedByUserId = userId;
            image.SourceType = PartyDataSource.UserCreated;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new UpdatePartyResult
        {
            PartyId = party.Id,
            Images = uploads.Select(upload => new PartyImageUploadResult { ImageId = upload.Image.Id, FileObjectId = upload.FileObjectId, UploadUrl = upload.Url }).ToList(),
        };
    }

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

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        dbContext.Parties.Add(party);
        await dbContext.SaveChangesAsync(cancellationToken);

        Guid jobId = backgroundTaskQueue.StageWorker(
            new PartyInfoEnrichmentWorker { PartyId = party.Id }, dbContext);

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        backgroundTaskQueue.NotifyWorker(jobId);

        return party.Id;
    }

    public async Task<IList<PartyItems>> GetAllAsync(
        PartyListRequest request,
        CancellationToken cancellationToken = default
    )
    {
        IQueryable<Core.Entities.Party> query = dbContext.Parties.AsNoTracking();

        string normalizedSearch = StringUtils.NormalizeString(request.Search ?? string.Empty);
        string searchPattern = $"%{normalizedSearch}%";
        bool hasSearch = normalizedSearch.Length > 0;

        if (request.Country != null)
        {
            query = query.Where(p => p.Country == request.Country);
        }

        if (request.Type != null)
        {
            query = query.Where(p => p.Type == request.Type);
        }

        if (request.Kind != null)
        {
            query = query.Where(p => p.Kind == request.Kind);
        }

        if (request.Gender != null)
        {
            query = query.Where(p => p.Gender == request.Gender);
        }

        if (request.ExcludeNoAlbums)
        {
            query = query.Where(p => p.AlbumCredits.Count > 0);
        }

        if (hasSearch)
        {
            query = query.Where(party =>
                EF.Functions.Like(
                    AppDbContext.ImmutableUnaccent(party.NormalizedName),
                    AppDbContext.ImmutableUnaccent(searchPattern)
                )
                || EF.Functions.TrigramsAreSimilar(
                    AppDbContext.ImmutableUnaccent(party.NormalizedName),
                    AppDbContext.ImmutableUnaccent(normalizedSearch)
                )
                || dbContext.PartyAliases.Any(alias =>
                    alias.PartyId == party.Id
                    && alias.DeletedAt == null
                    && (
                        EF.Functions.Like(
                            AppDbContext.ImmutableUnaccent(alias.NormalizedName),
                            AppDbContext.ImmutableUnaccent(searchPattern)
                        )
                        || EF.Functions.TrigramsAreSimilar(
                            AppDbContext.ImmutableUnaccent(alias.NormalizedName),
                            AppDbContext.ImmutableUnaccent(normalizedSearch)
                        )
                    )
                )
            );
        }

        var partyQuery = query.Select(party => new
        {
            PartyId = party.Id,
            party.Name,
            party.NormalizedName,
            party.Country,
            party.Type,
            party.Kind,
            party.Gender,
            party.CreatedAt,
            Similarity = hasSearch
                ? Math.Max(
                    EF.Functions.TrigramsSimilarity(
                        AppDbContext.ImmutableUnaccent(party.NormalizedName),
                        AppDbContext.ImmutableUnaccent(normalizedSearch)
                    ),
                    dbContext
                        .PartyAliases.Where(alias =>
                            alias.PartyId == party.Id && alias.DeletedAt == null
                        )
                        .Max(alias =>
                            (double?)
                                EF.Functions.TrigramsSimilarity(
                                    AppDbContext.ImmutableUnaccent(alias.NormalizedName),
                                    AppDbContext.ImmutableUnaccent(normalizedSearch)
                                )
                        )
                        ?? 0.0
                )
                : 0.0,
            AlbumCount = party.AlbumCredits.Count(credit => credit.Credit == CreditType.Artist),
            CoverStoragePath = party
                .Images.Where(image => image.ImageRole == ImageRole.Avatar && image.IsPrimary)
                .OrderBy(image => image.CreatedAt)
                .SelectMany(image => image.File!.FileObjects)
                .OrderBy(fileObject => fileObject.FileObjectVariant)
                .Select(fileObject => fileObject.StoragePath)
                .FirstOrDefault(),
        });

        partyQuery = request.Sort switch
        {
            ListSortOption.TitleDesc => partyQuery.OrderByDescending(p => p.Name),
            ListSortOption.CreatedAtDesc => partyQuery.OrderByDescending(p => p.CreatedAt),
            ListSortOption.CreatedAtAsc => partyQuery.OrderBy(p => p.CreatedAt),
            _ => partyQuery.OrderBy(p => p.Name),
        };

        if (request.Limit > 0)
        {
            query = query.Take(request.Limit);
        }

        var parties = await partyQuery.ToListAsync(cancellationToken);

        int[] partyIds = parties.Select(p => p.PartyId).ToArray();
        Dictionary<int, List<PartyAlias>> aliasesByPartyId = [];

        if (partyIds.Length > 0)
        {
            var aliases = await dbContext
                .PartyAliases.AsNoTracking()
                .Where(alias => partyIds.Contains(alias.PartyId) && alias.DeletedAt == null)
                .OrderBy(alias => alias.Name)
                .Select(alias => new
                {
                    alias.PartyId,
                    Alias = new PartyAlias
                    {
                        Id = alias.Id,
                        Name = alias.Name,
                        NormalizedName = alias.NormalizedName,
                    },
                })
                .ToListAsync(cancellationToken);

            aliasesByPartyId = aliases
                .GroupBy(alias => alias.PartyId)
                .ToDictionary(
                    group => group.Key,
                    group => group.Select(alias => alias.Alias).ToList()
                );
        }

        return parties
            .Select(p => new PartyItems
            {
                PartyId = p.PartyId,
                Name = p.Name,
                NormalizedName = p.NormalizedName,
                CoverUrl = p.CoverStoragePath is null
                    ? string.Empty
                    : assetsService.GetUrl(p.CoverStoragePath),
                Country = p.Country,
                Type = p.Type,
                Kind = p.Kind,
                Gender = p.Gender,
                Similarity = p.Similarity,
                AlbumCount = p.AlbumCount,
                Aliases = aliasesByPartyId.TryGetValue(p.PartyId, out var aliases) ? aliases : [],
            })
            .ToList();
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
            MusicBrainzId = party.MusicBrainzId,
            DebutDate = party.DebutDate,
            ExternalInfos = party.PartyExternalInfos.Select(info => new UpdatePartyExternalInfoRequest
            {
                Id = info.Id,
                Type = info.Type,
                ExternalId = info.ExternalId,
            }).ToList(),
            Images = party.Images.Select(image => new PartyImageDetails
            {
                Id = image.Id,
                ImageRole = image.ImageRole,
                IsPrimary = image.IsPrimary,
                CroppedArea = image.CropX.HasValue && image.CropY.HasValue && image.CropWidth.HasValue && image.CropHeight.HasValue
                    ? new Music.Core.Services.Files.Requests.FileCroppedAreaRequest
                    {
                        X = image.CropX.Value,
                        Y = image.CropY.Value,
                        Width = image.CropWidth.Value,
                        Height = image.CropHeight.Value,
                    } : null,
                Url = image.File?.FileObjects.OrderBy(x => x.FileObjectVariant).FirstOrDefault() is { } fileObject
                    ? assetsService.GetUrl(fileObject.StoragePath) : null,
            }).ToList(),
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
                    Id = alias.Id,
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
            PartyExternalInfoType.Spotify =>
                $"https://open.spotify.com/artist/{EscapePathSegment(value)}",
            PartyExternalInfoType.Twitter =>
                $"https://x.com/{EscapePathSegment(value.TrimStart('@'))}",
            PartyExternalInfoType.OfficialWebsite => value,
            PartyExternalInfoType.YouTube => BuildYouTubeUrl(value),
            PartyExternalInfoType.YouTubeMusic => BuildYouTubeMusicUrl(value),
            PartyExternalInfoType.Instagram =>
                $"https://www.instagram.com/{EscapePathSegment(value.TrimStart('@'))}",
            PartyExternalInfoType.AppleMusic =>
                $"https://music.apple.com/artist/{EscapePathSegment(value)}",
            PartyExternalInfoType.Mora => $"https://mora.jp/artist/{EscapePathSegment(value)}/",
            PartyExternalInfoType.Ototoy =>
                $"https://ototoy.jp/_/default/a/{EscapePathSegment(value)}",
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
