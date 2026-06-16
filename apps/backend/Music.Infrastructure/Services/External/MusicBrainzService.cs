using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Music.Core.Common.Utils;
using Music.Core.Options;
using Music.Core.Services.Parties.Enums;
using Music.Infrastructure.Utils;

namespace Music.Infrastructure.Services.External;

public class MusicBrainzService(
    ILogger<MusicBrainzService> logger,
    IHttpClientFactory httpClientFactory,
    IOptions<ExternalOptions> externalOptions
)
{
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();
    private readonly ExternalOptions _externalOptions = externalOptions.Value;

    public async Task<MusicBrainzSearchArtist?> SearchMusicBrainzByPartyName(
        string partyName,
        string normalizedPartyName,
        CancellationToken cancellationToken = default
    )
    {
        string searchUrl =
            $"https://musicbrainz.org/ws/2/artist/?query={Uri.EscapeDataString(partyName)}&fmt=json&limit=5&dismax=true";

        MusicBrainzSearchResponse? searchResult =
            await ExternalFetchClient.FetchClient<MusicBrainzSearchResponse>(
                logger,
                searchUrl,
                _httpClient,
                providerName: "MusicBrainz",
                userAgent: _externalOptions.UserAgent,
                cancellationToken: cancellationToken
            );

        if (searchResult?.Artists is null || searchResult.Artists.Count == 0)
        {
            return null;
        }

        return searchResult.Artists.FirstOrDefault(a => IsNameOrAliasMatch(a, normalizedPartyName));
    }

    private static bool IsNameOrAliasMatch(
        MusicBrainzSearchArtist artist,
        string normalizedPartyName
    )
    {
        if (
            !string.IsNullOrWhiteSpace(artist.Name)
            && StringUtils.NormalizeString(artist.Name) == normalizedPartyName
        )
        {
            return true;
        }

        if (
            !string.IsNullOrWhiteSpace(artist.SortName)
            && StringUtils.NormalizeString(artist.SortName) == normalizedPartyName
        )
        {
            return true;
        }

        foreach (MusicBrainzAlias alias in artist.Aliases ?? [])
        {
            if (
                !string.IsNullOrWhiteSpace(alias.Name)
                && StringUtils.NormalizeString(alias.Name) == normalizedPartyName
            )
            {
                return true;
            }

            if (
                !string.IsNullOrWhiteSpace(alias.SortName)
                && StringUtils.NormalizeString(alias.SortName) == normalizedPartyName
            )
            {
                return true;
            }
        }

        return false;
    }

    public async Task<MusicBrainzLookupResponse?> GetMusicBrainzPartyDetails(
        string musicBrainzId,
        CancellationToken cancellationToken = default
    )
    {
        string lookupUri =
            $"https://musicbrainz.org/ws/2/artist/{Uri.EscapeDataString(musicBrainzId)}?inc=aliases+url-rels&fmt=json";

        return await ExternalFetchClient.FetchClient<MusicBrainzLookupResponse>(
            logger,
            lookupUri,
            _httpClient,
            providerName: "MusicBrainz",
            userAgent: _externalOptions.UserAgent,
            cancellationToken: cancellationToken
        );
    }

    public static IList<PartyAliasRecords> BuildPartyAliasFromMusicBrainz(
        IReadOnlyList<MusicBrainzAlias> musicBrainzAliases
    )
    {
        Dictionary<string, PartyAliasRecords> aliasMap = new(StringComparer.Ordinal);

        foreach (MusicBrainzAlias alias in musicBrainzAliases)
        {
            AddAlias(aliasMap, alias.Name, alias.Type);
            AddAlias(aliasMap, alias.SortName, alias.Type);
        }

        return aliasMap.Values.ToList();
    }

    public static CountryCode? ConvertCountryCode(string? country)
    {
        if (string.IsNullOrWhiteSpace(country))
        {
            return null;
        }

        return Enum.TryParse(country.Trim(), ignoreCase: true, out CountryCode countryCode)
            ? countryCode
            : null;
    }

    public static PartyGender ConvertGender(string? gender)
    {
        return gender?.Trim().ToLowerInvariant() switch
        {
            "male" => PartyGender.Male,
            "female" => PartyGender.Female,
            _ => PartyGender.Unknown,
        };
    }

    private static void AddAlias(
        Dictionary<string, PartyAliasRecords> map,
        string? name,
        string? type
    )
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return;
        }

        string normalized = StringUtils.NormalizeString(name);

        if (!map.ContainsKey(normalized))
        {
            map[normalized] = new PartyAliasRecords { Name = name, Type = type };
        }
    }
}

public sealed class PartyAliasRecords
{
    public required string Name { get; set; }
    public string? Type { get; set; }
}

public sealed class MusicBrainzSearchResponse
{
    public List<MusicBrainzSearchArtist> Artists { get; init; } = [];
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

public sealed class MusicBrainzLookupResponse
{
    public string Id { get; init; } = string.Empty;
    public string? Name { get; init; }
    public string? Country { get; init; }
    public string? Gender { get; init; }

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
    public string? Type { get; init; }

    [JsonPropertyName("url")]
    public MusicBrainzUrl? Url { get; init; }
}

public sealed class MusicBrainzUrl
{
    [JsonPropertyName("resource")]
    public string? Resource { get; init; }
}
