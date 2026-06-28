using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Music.Core.Common.Utils;
using Music.Core.Entities;
using Music.Core.Options;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Images.Enums;
using Music.Core.Services.Parties;
using Music.Core.Services.Parties.Enums;
using Music.Core.Storage;
using Music.Core.Workers;
using Music.Infrastructure.Data;
using Music.Infrastructure.Services.External;

namespace Music.Infrastructure.Workers.Processor;

public class PartyInfoEnrichmentWorkerProcessor(
    AppDbContext dbContext,
    MusicBrainzService musicBrainzService,
    PartyAvatarService partyAvatarService,
    TwitterService twitterService,
    IHashService hashService,
    IAssetsService assetsService,
    ILogger<PartyInfoEnrichmentWorkerProcessor> logger
)
{
    private const string UnavatarFailedImageHash =
        "7bee1c0fac5138e699bccd929b283e658315d5fb7dd5c3875d9f88f01409b7b8";

    public async Task ProcessAsync(
        PartyInfoEnrichmentWorker partyInfoEnrichmentWorker,
        CancellationToken cancellationToken = default
    )
    {
        int partyId = partyInfoEnrichmentWorker.PartyId;

        Party? party = await dbContext
            .Parties.Include(p => p.Aliases)
            .Include(p => p.PartyExternalInfos)
            .Include(p => p.Images)
                .ThenInclude(i => i.File)
                    .ThenInclude(f => f!.FileObjects)
            .FirstOrDefaultAsync(p => p.Id == partyId, cancellationToken);

        if (party is null)
        {
            logger.LogWarning("Party {PartyId} not found for external enrichment", partyId);
            return;
        }

        await ResetSystemProvidedPartyData(party, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        MusicBrainzSearchArtist? searchArtist =
            await musicBrainzService.SearchMusicBrainzByPartyName(
                party.Name,
                party.NormalizedName,
                cancellationToken
            );

        if (searchArtist is null)
        {
            logger.LogWarning(
                "No MusicBrainz artist found for party {PartyId} ({Name})",
                partyId,
                party.Name
            );
            return;
        }

        MusicBrainzLookupResponse? lookupResponse =
            await musicBrainzService.GetMusicBrainzPartyDetails(searchArtist.Id, cancellationToken);

        if (lookupResponse is null)
        {
            logger.LogWarning(
                "No MusicBrainz details found for party {PartyId} ({MusicBrainzId})",
                partyId,
                searchArtist.Id
            );
            return;
        }

        party.MusicBrainzId = searchArtist.Id;

        List<Core.Entities.PartyAlias> aliasesToRemove = party
            .Aliases.Where(a => a.SourceType == AliasSourceType.MusicBrainz)
            .ToList();

        dbContext.RemoveRange(aliasesToRemove);

        if (lookupResponse.Aliases is { Count: > 0 })
        {
            IList<PartyAliasRecords> aliasRecords =
                MusicBrainzService.BuildPartyAliasFromMusicBrainz(lookupResponse.Aliases);

            foreach (PartyAliasRecords aliasRecord in aliasRecords)
            {
                dbContext.PartyAliases.Add(
                    new Core.Entities.PartyAlias
                    {
                        PartyId = party.Id,
                        Name = aliasRecord.Name,
                        Type = aliasRecord.Type,
                        SourceType = AliasSourceType.MusicBrainz,
                    }
                );
            }
        }

        CountryCode? country = MusicBrainzService.ConvertCountryCode(lookupResponse.Country);

        if (country is not null && party.Country == CountryCode.XX)
        {
            party.Country = country.Value;
        }

        party.Gender = MusicBrainzService.ConvertGender(lookupResponse.Gender);

        Dictionary<PartyExternalInfoType, string> externalInfos = ExtractExternalInfoValues(
            lookupResponse.Relations ?? []
        );

        foreach (KeyValuePair<PartyExternalInfoType, string> externalInfo in externalInfos)
        {
            AddPartyExternalInfo(party, externalInfo.Key, externalInfo.Value);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        string? appleMusicId = party
            .PartyExternalInfos.FirstOrDefault(info =>
                info.Type == PartyExternalInfoType.AppleMusic
            )
            ?.ExternalId;
        string? twitterName = party
            .PartyExternalInfos.FirstOrDefault(info => info.Type == PartyExternalInfoType.Twitter)
            ?.ExternalId;

        FxTwitterProfile? twitterProfile;

        if (!string.IsNullOrWhiteSpace(twitterName))
        {
            twitterProfile = await twitterService.FetchTwitterProfile(
                twitterName,
                cancellationToken
            );

            if (
                string.IsNullOrWhiteSpace(party.Description)
                && !string.IsNullOrWhiteSpace(twitterProfile?.Description)
            )
            {
                party.Description = twitterProfile.Description;
                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }
        else
        {
            twitterProfile = null;
        }

        if (HasPrimaryImage(party, ImageRole.Avatar))
        {
            return;
        }

        if (!string.IsNullOrWhiteSpace(appleMusicId))
        {
            (string? tempPath, string? mimeType) =
                await partyAvatarService.GetAppleMusicAvatarAsync(appleMusicId, cancellationToken);

            if (
                !string.IsNullOrWhiteSpace(tempPath)
                && !string.IsNullOrWhiteSpace(mimeType)
                && await SavePartyImageAsync(
                    party,
                    $"avatar_apple_music_{appleMusicId}_{DateTime.UtcNow}{Path.GetExtension(tempPath)}",
                    tempPath,
                    ImageRole.Avatar,
                    mimeType,
                    cancellationToken
                )
            )
            {
                return;
            }
        }

        if (twitterProfile is not null)
        {
            (string? tempPath, string? mimeType) = await partyAvatarService.SaveImageFileToTempDir(
                twitterProfile.AvatarUrl,
                cancellationToken
            );

            if (!string.IsNullOrWhiteSpace(tempPath) && !string.IsNullOrWhiteSpace(mimeType))
            {
                await SavePartyImageAsync(
                    party,
                    $"avatar_twitter_{twitterName}_{DateTime.UtcNow}.{Path.GetExtension(tempPath)}",
                    tempPath,
                    ImageRole.Avatar,
                    mimeType,
                    cancellationToken
                );
            }
        }
    }

    private async Task ResetSystemProvidedPartyData(
        Party party,
        CancellationToken cancellationToken
    )
    {
        List<PartyExternalInfo> externalInfosToRemove = party
            .PartyExternalInfos.Where(info => info.AddedByUserId is null)
            .ToList();

        List<Core.Entities.PartyImage> imagesToRemove = party
            .Images.Where(image => image.AddedByUserId is null)
            .ToList();

        List<StoredFile> filesToRemove = imagesToRemove
            .Select(image => image.File)
            .OfType<StoredFile>()
            .ToList();

        List<string> storagePathsToDelete = filesToRemove
            .SelectMany(file => file.FileObjects)
            .Select(fileObject => fileObject.StoragePath)
            .Distinct()
            .ToList();

        foreach (string storagePath in storagePathsToDelete)
        {
            await assetsService.DeleteFileAsync(storagePath, cancellationToken);
        }

        dbContext.PartyExternalInfos.RemoveRange(externalInfosToRemove);
        dbContext.PartyImages.RemoveRange(imagesToRemove);
        dbContext.StoredFiles.RemoveRange(filesToRemove);

        foreach (PartyExternalInfo externalInfo in externalInfosToRemove)
        {
            party.PartyExternalInfos.Remove(externalInfo);
        }

        foreach (Core.Entities.PartyImage image in imagesToRemove)
        {
            party.Images.Remove(image);
        }
    }

    public async Task<bool> SavePartyImageAsync(
        Party party,
        string fileName,
        string imagePath,
        ImageRole imageRole,
        string mimeType,
        CancellationToken cancellationToken
    )
    {
        try
        {
            string blake3Hash = await hashService.ComputeBlake3HashAsync(
                imagePath,
                cancellationToken
            );

            if (blake3Hash == UnavatarFailedImageHash)
            {
                return false;
            }

            string extension = MediaFiles.GetExtensionFromMimeType(mimeType, fileName);
            string storagePath = assetsService.GetStoragePath(
                MediaFolderOptions.PartyCover,
                blake3Hash,
                mimeType,
                fileName
            );

            await assetsService.UploadFileFromTempAsync(
                storagePath,
                imagePath,
                mimeType,
                cancellationToken
            );

            StoredFile storedFile = new()
            {
                Type = FileType.Image,
                OriginalBlake3Hash = blake3Hash,
                OriginalFileName = fileName,
            };

            FileObject fileObject = new()
            {
                File = storedFile,
                StorageArea = StorageArea.Assets,
                StoragePath = storagePath,
                ObjectBlake3Hash = blake3Hash,
                FileObjectVariant = FileObjectVariant.Original,
                ProcessingStatus = FileProcessingStatus.Pending,
                SizeInBytes = new FileInfo(imagePath).Length,
                MimeType = mimeType,
                Container = extension,
                Extension = extension,
                Lossless = false,
            };

            Core.Entities.PartyImage partyImage = new()
            {
                PartyId = party.Id,
                Party = party,
                FileId = storedFile.Id,
                File = storedFile,
                IsPrimary = true,
                ImageRole = imageRole,
                AddedByUserId = null,
            };

            dbContext.StoredFiles.Add(storedFile);
            dbContext.FileObjects.Add(fileObject);
            dbContext.PartyImages.Add(partyImage);

            await dbContext.SaveChangesAsync(cancellationToken);

            await assetsService.RunBackgroundProcessUploadFileAsync(
                new ImageUploadProcessWorker { FileObjectId = fileObject.Id },
                cancellationToken
            );

            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to save party image");
            return false;
        }
        finally
        {
            if (!string.IsNullOrWhiteSpace(imagePath) && File.Exists(imagePath))
            {
                try
                {
                    File.Delete(imagePath);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(
                        ex,
                        "Failed to cleanup temporary image file {TempPath}",
                        imagePath
                    );
                }
            }
        }
    }

    private static bool HasPrimaryImage(Party party, ImageRole imageRole)
    {
        return party.Images.Any(image => image.ImageRole == imageRole && image.IsPrimary);
    }

    private static void AddPartyExternalInfo(
        Party party,
        PartyExternalInfoType type,
        string? externalId
    )
    {
        if (string.IsNullOrWhiteSpace(externalId))
        {
            return;
        }

        PartyExternalInfo? existingExternalInfo = party.PartyExternalInfos.FirstOrDefault(info =>
            info.Type == type
        );

        if (existingExternalInfo is not null)
        {
            if (existingExternalInfo.AddedByUserId is not null)
            {
                return;
            }

            existingExternalInfo.ExternalId = externalId;
            return;
        }

        party.PartyExternalInfos.Add(
            new PartyExternalInfo
            {
                PartyId = party.Id,
                Party = party,
                Type = type,
                ExternalId = externalId,
            }
        );
    }

    public static Dictionary<PartyExternalInfoType, string> ExtractExternalInfoValues(
        IReadOnlyList<MusicBrainzRelation> relations
    )
    {
        Dictionary<PartyExternalInfoType, string> externalInfos = [];

        foreach (MusicBrainzRelation relation in relations)
        {
            string? resource = relation.Url?.Resource;
            if (
                string.IsNullOrWhiteSpace(resource)
                || !Uri.TryCreate(resource, UriKind.Absolute, out Uri? uri)
            )
            {
                continue;
            }

            string host = uri.Host.ToLowerInvariant();

            if (
                string.Equals(
                    relation.Type,
                    "official homepage",
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                AddExternalInfo(externalInfos, PartyExternalInfoType.OfficialWebsite, resource);
            }

            if (host.Contains("spotify.com", StringComparison.OrdinalIgnoreCase))
            {
                AddExternalInfo(
                    externalInfos,
                    PartyExternalInfoType.Spotify,
                    TryExtractLastPathSegment(uri)
                );
                continue;
            }

            if (IsHostOrSubdomain(host, "twitter.com") || IsHostOrSubdomain(host, "x.com"))
            {
                AddExternalInfo(
                    externalInfos,
                    PartyExternalInfoType.Twitter,
                    TryExtractTwitterName(uri)
                );
                continue;
            }

            if (host == "music.youtube.com")
            {
                AddExternalInfo(
                    externalInfos,
                    PartyExternalInfoType.YouTubeMusic,
                    TryExtractLastPathSegment(uri)
                );
                continue;
            }

            if (
                host.Contains("youtube.com", StringComparison.OrdinalIgnoreCase)
                || host.Contains("youtu.be", StringComparison.OrdinalIgnoreCase)
            )
            {
                AddExternalInfo(
                    externalInfos,
                    PartyExternalInfoType.YouTube,
                    TryExtractLastPathSegment(uri)
                );
                continue;
            }

            if (host.Contains("instagram.com", StringComparison.OrdinalIgnoreCase))
            {
                AddExternalInfo(
                    externalInfos,
                    PartyExternalInfoType.Instagram,
                    TryExtractFirstPathSegment(uri)
                );
                continue;
            }

            if (host == "music.apple.com")
            {
                AddExternalInfo(
                    externalInfos,
                    PartyExternalInfoType.AppleMusic,
                    TryExtractLastPathSegment(uri)
                );
                continue;
            }

            if (host.Contains("mora.jp", StringComparison.OrdinalIgnoreCase))
            {
                AddExternalInfo(
                    externalInfos,
                    PartyExternalInfoType.Mora,
                    TryExtractLastPathSegment(uri)
                );
                continue;
            }

            if (host.Contains("ototoy.jp", StringComparison.OrdinalIgnoreCase))
            {
                AddExternalInfo(
                    externalInfos,
                    PartyExternalInfoType.Ototoy,
                    TryExtractLastPathSegment(uri)
                );
            }
        }

        return externalInfos;
    }

    private static bool IsHostOrSubdomain(string host, string domain)
    {
        return string.Equals(host, domain, StringComparison.OrdinalIgnoreCase)
            || host.EndsWith($".{domain}", StringComparison.OrdinalIgnoreCase);
    }

    private static void AddExternalInfo(
        Dictionary<PartyExternalInfoType, string> externalInfos,
        PartyExternalInfoType type,
        string? externalId
    )
    {
        if (string.IsNullOrWhiteSpace(externalId) || externalInfos.ContainsKey(type))
        {
            return;
        }

        externalInfos[type] = externalId;
    }

    private static string? TryExtractTwitterName(Uri uri)
    {
        string? userName = TryExtractFirstPathSegment(uri);

        if (
            string.IsNullOrWhiteSpace(userName)
            || string.Equals(userName, "i", StringComparison.OrdinalIgnoreCase)
            || string.Equals(userName, "intent", StringComparison.OrdinalIgnoreCase)
        )
        {
            return null;
        }

        return userName.TrimStart('@');
    }

    public static string? TryExtractLastPathSegment(Uri uri)
    {
        string[] parts = uri.AbsolutePath.Split(
            '/',
            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries
        );

        return parts.LastOrDefault();
    }

    public static string? TryExtractFirstPathSegment(Uri uri)
    {
        string[] parts = uri.AbsolutePath.Split(
            '/',
            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries
        );

        return parts.FirstOrDefault();
    }
}
