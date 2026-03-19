using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Music.Core.Entities;
using Music.Core.Enums;
using Music.Core.Models;
using Music.Core.Services.Interfaces;
using Music.Core.Utils;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Party;

public sealed class PartyExternalEnrichmentService(
    AppDbContext dbContext,
    IAssetsService assetsService,
    IHashService hashService,
    IHttpClientFactory httpClientFactory,
    IOptions<StorageOptions> storageOptions,
    IOptions<ExternalOptions> externalOptions,
    ILogger<PartyExternalEnrichmentService> logger) : IPartyExternalEnrichmentService
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IAssetsService _assetsService = assetsService;
    private readonly IHashService _hashService = hashService;
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();
    private readonly StorageOptions _storageOptions = storageOptions.Value;
    private readonly ExternalOptions _externalOptions = externalOptions.Value;
    private readonly ILogger<PartyExternalEnrichmentService> _logger = logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };


    public async Task EnrichPartyAsync(int partyId, CancellationToken cancellationToken = default)
    {
        Core.Entities.Party? party = await _dbContext.Parties
            .Include(p => p.Aliases)
            .Include(p => p.PartyExternalInfos)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == partyId, cancellationToken);

        if (party is null)
        {
            _logger.LogWarning("Party {PartyId} not found for external enrichment", partyId);
            return;
        }

        MusicBrainzSearchArtist? musicBrainzSearchArtist = await SearchMusicBrainzByPartyName(party.Name, party.NormalizedName, cancellationToken);

        if (musicBrainzSearchArtist is null)
        {
            return;
        }

        party.MusicBrainzId = musicBrainzSearchArtist.Id;

        MusicBrainzLookupResponse? musicBrainzLookupResponse = await GetMusicBrainzPartyDetails(musicBrainzSearchArtist.Id, cancellationToken);

        if (musicBrainzLookupResponse is null)
        {
            return;
        }

        party.Country = musicBrainzLookupResponse.Country;

        (string? spotifyId, string? twitterName) = ExtractSocialValues(musicBrainzLookupResponse.Relations ?? []);

        List<PartyAlias> toRemove = party.Aliases
            .Where(a => a.SourceType == AliasSourceType.MusicBrainz)
            .ToList();

        _dbContext.RemoveRange(toRemove);

        if (musicBrainzLookupResponse.Aliases != null && musicBrainzLookupResponse.Aliases.Count != 0)
        {
            IList<PartyAliasRecords> partyAliasRecords = BuildPartyAliasFromMusicBrainz(musicBrainzLookupResponse.Aliases);

            foreach (PartyAliasRecords partyAliasRecord in partyAliasRecords)
            {
                _dbContext.PartyAliases.Add(new PartyAlias
                {
                    PartyId = party.Id,
                    Name = partyAliasRecord.Name,
                    Type = partyAliasRecord.Type,
                    SourceType = AliasSourceType.MusicBrainz,
                });
            }
        }
        bool hasImage = false;
        if (!string.IsNullOrEmpty(twitterName))
        {
            FxTwitterProfile? fxTwitterProfile = await FetchTwitterProfile(twitterName, cancellationToken);
            if (fxTwitterProfile != null)
            {
                hasImage = true;

                if (!party.Images.Any(i => i.PartyImageType == PartyImageType.Avatar && i.IsPrimary) &&
                    !string.IsNullOrWhiteSpace(fxTwitterProfile.AvatarUrl))
                {
                    await SavePartyImageAsync(
                        party,
                        fxTwitterProfile.AvatarUrl,
                        PartyImageType.Avatar,
                        cancellationToken);
                }

                if (!party.Images.Any(i => i.PartyImageType == PartyImageType.Banner && i.IsPrimary) &&
                    !string.IsNullOrWhiteSpace(fxTwitterProfile.BannerUrl))
                {
                    await SavePartyImageAsync(
                        party,
                        fxTwitterProfile.BannerUrl,
                        PartyImageType.Banner,
                        cancellationToken);
                }
            }
        }

        if (!hasImage && !string.IsNullOrEmpty(spotifyId))
        {
            hasImage = true;

            if (!party.Images.Any(i => i.PartyImageType == PartyImageType.Avatar && i.IsPrimary))
            {
                string requestUrl = $"https://unavatar.io/spotify/artist:{Uri.EscapeDataString(spotifyId)}";

                await SavePartyImageAsync(
                    party,
                    requestUrl,
                    PartyImageType.Avatar,
                    cancellationToken);
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task SavePartyImageAsync(
        Core.Entities.Party party,
        string imageUrl,
        PartyImageType imageType,
        CancellationToken cancellationToken)
    {
        string? tempPath = null;

        try
        {
            using HttpRequestMessage request = new(HttpMethod.Get, imageUrl);
            using HttpResponseMessage response = await _httpClient.SendAsync(request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return;
            }

            string mimeType = response.Content.Headers.ContentType?.MediaType?.Trim().ToLowerInvariant() ?? "image/jpeg";
            string extension = ResolveFileExtension(mimeType, imageUrl);

            Directory.CreateDirectory(_storageOptions.TempDir);
            tempPath = Path.Combine(
                _storageOptions.TempDir,
                $"party_external_{party.Id}_{Guid.NewGuid():N}.{extension}");

            await using (FileStream fileStream = File.Create(tempPath))
            {
                await response.Content.CopyToAsync(fileStream, cancellationToken);
            }

            string blake3Hash = await _hashService.ComputeBlake3HashAsync(tempPath, cancellationToken);
            string storagePath = _assetsService.GetStoragePath(
                imageType == PartyImageType.Avatar ? MediaFolderOptions.PartyCover : MediaFolderOptions.PartyBanner,
                blake3Hash,
                mimeType);

            await _assetsService.UploadFileFromTempAsync(storagePath, tempPath, cancellationToken);

            StoredFile storedFile = new()
            {
                Type = FileType.Image
            };

            string originalFileName = BuildOriginalFileName(imageUrl, party.Id, imageType, extension);

            FileObject fileObject = new()
            {
                File = storedFile,
                StoragePath = storagePath,
                OriginalBlake3Hash = blake3Hash,
                CurrentBlake3Hash = blake3Hash,
                Type = FileObjectType.Original,
                FileObjectVariant = FileObjectVariant.Original,
                ProcessingStatus = FileProcessingStatus.Completed,
                SizeInBytes = new FileInfo(tempPath).Length,
                MimeType = mimeType,
                Container = mimeType,
                Extension = extension,
                OriginalFileName = originalFileName,
                CreatedByUserId = null,
            };

            PartyImage partyImage = new()
            {
                PartyId = party.Id,
                Party = party,
                FileId = storedFile.Id,
                File = storedFile,
                IsPrimary = true,
                PartyImageType = imageType,
            };

            _dbContext.StoredFiles.Add(storedFile);
            _dbContext.FileObjects.Add(fileObject);
            _dbContext.PartyImages.Add(partyImage);
            party.Images.Add(partyImage);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to import party {PartyId} {ImageType} image from {ImageUrl}", party.Id, imageType, imageUrl);
        }
        finally
        {
            if (!string.IsNullOrWhiteSpace(tempPath) && File.Exists(tempPath))
            {
                try
                {
                    File.Delete(tempPath);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to cleanup temporary image file {TempPath}", tempPath);
                }
            }
        }
    }

    public static string BuildOriginalFileName(
        string imageUrl,
        int partyId,
        PartyImageType imageType,
        string extension)
    {
        if (Uri.TryCreate(imageUrl, UriKind.Absolute, out Uri? uri))
        {
            string fileName = Path.GetFileName(uri.AbsolutePath);
            if (!string.IsNullOrWhiteSpace(fileName))
            {
                return fileName;
            }
        }

        return $"party_{partyId}_{imageType.ToString().ToLowerInvariant()}.{extension}";
    }


    public static string ResolveFileExtension(string mimeType, string imageUrl)
    {
        string extension = mimeType switch
        {
            "image/jpeg" => "jpg",
            "image/png" => "png",
            "image/webp" => "webp",
            "image/gif" => "gif",
            "image/bmp" => "bmp",
            _ => string.Empty
        };

        if (!string.IsNullOrWhiteSpace(extension))
        {
            return extension;
        }

        if (Uri.TryCreate(imageUrl, UriKind.Absolute, out Uri? uri))
        {
            string possible = Path.GetExtension(uri.AbsolutePath).TrimStart('.').ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(possible) && possible.Length <= 8)
            {
                return possible;
            }
        }

        return "jpg";
    }
    public async Task<FxTwitterProfile?> FetchTwitterProfile(string twitterName, CancellationToken cancellationToken)
    {
        string requestUrl = $"https://api.fxtwitter.com/{Uri.EscapeDataString(twitterName)}";

        FxTwitterResponse? response = await FetchClient<FxTwitterResponse>(requestUrl, cancellationToken);

        if (response?.User is null)
            return null;

        return new FxTwitterProfile()
        {
            AvatarUrl = FixUrl(response.User.AvatarUrl ?? ""),
            BannerUrl = response.User.BannerUrl //this don't need it return the best quality by default.
        };
    }

    private static readonly Regex AvatarSuffixReplaceRegex = new(
        @"_(?:normal|bigger|mini|400x400)(\.[a-zA-Z0-9]+)$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static string FixUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return url;

        try
        {
            return AvatarSuffixReplaceRegex.Replace(url, "$1");
        }
        catch (Exception)
        {
            return url;
        }
    }


    public static (string? spotifyId, string? twitterName) ExtractSocialValues(IReadOnlyList<MusicBrainzRelation> relations)
    {
        string? spotifyId = null;
        string? twitterName = null;

        foreach (MusicBrainzRelation relation in relations)
        {
            string? resource = relation.Url?.Resource;
            if (string.IsNullOrWhiteSpace(resource) || !Uri.TryCreate(resource, UriKind.Absolute, out Uri? uri))
            {
                continue;
            }

            string host = uri.Host.ToLowerInvariant();

            if (spotifyId is null && host.Contains("spotify.com", StringComparison.OrdinalIgnoreCase))
            {
                spotifyId = TryExtractLastPathSegment(uri);
                continue;
            }

            if (twitterName is null &&
                (host.Contains("twitter.com", StringComparison.OrdinalIgnoreCase) ||
                 host.Contains("x.com", StringComparison.OrdinalIgnoreCase)))
            {
                string? userName = TryExtractFirstPathSegment(uri);

                if (!string.IsNullOrWhiteSpace(userName) &&
                    !string.Equals(userName, "i", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(userName, "intent", StringComparison.OrdinalIgnoreCase))
                {
                    twitterName = userName.TrimStart('@');
                }
            }
        }

        return (spotifyId, twitterName);
    }

    public static IList<PartyAliasRecords> BuildPartyAliasFromMusicBrainz(
        IReadOnlyList<MusicBrainzAlias> musicBrainzAliases)
    {
        var aliasMap = new Dictionary<string, PartyAliasRecords>(StringComparer.Ordinal);

        foreach (var alias in musicBrainzAliases)
        {
            AddAlias(aliasMap, alias.Name, alias.Type);
            AddAlias(aliasMap, alias.SortName, alias.Type);
        }

        return aliasMap.Values.ToList();
    }

    private static void AddAlias(
        Dictionary<string, PartyAliasRecords> map,
        string? name,
        string? type)
    {
        if (string.IsNullOrWhiteSpace(name))
            return;

        string normalized = StringUtils.NormalizeString(name);

        if (!map.ContainsKey(normalized))
        {
            map[normalized] = new PartyAliasRecords
            {
                Name = name,
                Type = type,
            };
        }
    }


    public async Task<MusicBrainzSearchArtist?> SearchMusicBrainzByPartyName(string partyName, string normalizedPartyName, CancellationToken cancellationToken = default)
    {
        string searchUrl = $"https://musicbrainz.org/ws/2/artist/?query={Uri.EscapeDataString(partyName)}&fmt=json&limit=5&dismax=true";

        MusicBrainzSearchResponse? searchResult = await FetchClient<MusicBrainzSearchResponse>(
            searchUrl,
            cancellationToken);


        if (searchResult?.Artists is null || searchResult.Artists.Count == 0)
        {
            return null;
        }

        return searchResult.Artists
            .FirstOrDefault(a => IsNameOrAliasMatch(a, normalizedPartyName));
    }

    public async Task<MusicBrainzLookupResponse?> GetMusicBrainzPartyDetails(string musicBrainzId, CancellationToken cancellationToken = default)
    {
        string lookupUri =
            $"https://musicbrainz.org/ws/2/artist/{Uri.EscapeDataString(musicBrainzId)}?inc=aliases+url-rels&fmt=json";

        MusicBrainzLookupResponse? lookupResult = await FetchClient<MusicBrainzLookupResponse>(
            lookupUri,
            cancellationToken);

        if (lookupResult is null)
        {
            return null;
        }

        return lookupResult;
    }

    private static bool IsNameOrAliasMatch(MusicBrainzSearchArtist artist, string normalizedPartyName)
    {

        if (!string.IsNullOrWhiteSpace(artist.Name) &&
            StringUtils.NormalizeString(artist.Name) == normalizedPartyName)
        {
            return true;
        }

        if (!string.IsNullOrWhiteSpace(artist.SortName) &&
            StringUtils.NormalizeString(artist.SortName) == normalizedPartyName)
        {
            return true;
        }
        // For real i think it is possible to have same result
        foreach (MusicBrainzAlias alias in artist.Aliases ?? [])
        {
            if (!string.IsNullOrWhiteSpace(alias.Name) &&
                StringUtils.NormalizeString(alias.Name) == normalizedPartyName)
            {
                return true;
            }

            if (!string.IsNullOrWhiteSpace(alias.SortName) &&
                StringUtils.NormalizeString(alias.SortName) == normalizedPartyName)
            {
                return true;
            }
        }

        return false;
    }


    public async Task<T?> FetchClient<T>(string requestUri, CancellationToken cancellationToken = default)
    {
        int maxRetries = 3;
        int delayMs = 250;
        int retryDelayMs = 500;

        for (int attempt = 0; attempt <= maxRetries; attempt++)
        {
            await Task.Delay(delayMs, cancellationToken);
            using HttpRequestMessage request = new(HttpMethod.Get, requestUri);
            request.Headers.TryAddWithoutValidation("User-Agent", _externalOptions.UserAgent);
            request.Headers.TryAddWithoutValidation("Accept", "application/json");

            using HttpResponseMessage response = await _httpClient.SendAsync(request, cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                await using Stream responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
                return await JsonSerializer.DeserializeAsync<T>(responseStream, JsonOptions, cancellationToken);
            }

            if (response.StatusCode is HttpStatusCode.ServiceUnavailable or HttpStatusCode.TooManyRequests)
            {
                if (attempt < maxRetries)
                {
                    await Task.Delay(retryDelayMs, cancellationToken);
                    continue;
                }

                _logger.LogWarning(
                    "MusicBrainz request failed with status {StatusCode} after retries: {RequestUri}",
                    (int)response.StatusCode,
                    requestUri);
                return default;
            }

            _logger.LogWarning(
                "MusicBrainz request failed with status {StatusCode}: {RequestUri}",
                (int)response.StatusCode,
                requestUri);
            return default;

        }
        return default;
    }


    public static string? TryExtractLastPathSegment(Uri uri)
    {
        string[] parts = uri.AbsolutePath
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return parts.LastOrDefault();
    }

    public static string? TryExtractFirstPathSegment(Uri uri)
    {
        string[] parts = uri.AbsolutePath
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return parts.FirstOrDefault();
    }
}

public sealed class PartyAliasRecords
{
    public required string Name { get; set; }
    public string? Type { get; set; }
}

public sealed class MusicBrainzSearchArtist
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("sort-name")]
    public string? SortName { get; init; }

    public int? Score { get; init; }

    public List<MusicBrainzAlias> Aliases { get; init; } = [];
}

public sealed class MusicBrainzSearchResponse
{
    public List<MusicBrainzSearchArtist> Artists { get; init; } = [];
}

public sealed class MusicBrainzLookupResponse
{
    public string Id { get; init; } = string.Empty;
    public string? Name { get; init; }
    public string? Country { get; init; }

    [JsonPropertyName("sort-name")]
    public string? SortName { get; init; }

    public List<MusicBrainzAlias> Aliases { get; init; } = [];
    public List<MusicBrainzRelation> Relations { get; init; } = [];
}

public sealed class MusicBrainzAlias
{
    public string? Name { get; init; }

    [JsonPropertyName("sort-name")]
    public string? SortName { get; init; }

    public string? Type { get; init; }
}

public sealed class MusicBrainzRelation
{
    public MusicBrainzUrl? Url { get; init; }
}

public sealed class MusicBrainzUrl
{
    public string? Resource { get; init; }
}

public sealed class FxTwitterProfile
{
    [JsonPropertyName("banner_url")]
    public string? BannerUrl { get; init; }
    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; init; }
}

public sealed class FxTwitterResponse
{
    public FxTwitterProfile? User { get; init; }
}
