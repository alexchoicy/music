using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Music.Core.Options;
using Music.Infrastructure.Utils;

namespace Music.Infrastructure.Services.External;

public class TwitterService(
    IHttpClientFactory httpClientFactory,
    ILogger<TwitterService> logger,
    IOptions<ExternalOptions> externalOptions
)
{
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();
    private readonly ExternalOptions _externalOptions = externalOptions.Value;

    private static readonly Regex AvatarSuffixReplaceRegex = new(
        @"_(?:normal|bigger|mini|400x400)(\.[a-zA-Z0-9]+)$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    public static string FixUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return url;
        }

        try
        {
            return AvatarSuffixReplaceRegex.Replace(url, "$1");
        }
        catch (Exception)
        {
            return url;
        }
    }

    public async Task<FxTwitterProfile?> FetchTwitterProfile(
        string twitterName,
        CancellationToken cancellationToken
    )
    {
        string requestUrl =
            $"https://api.fxtwitter.com/2/profile/{Uri.EscapeDataString(twitterName)}";

        FxTwitterResponse? response = await ExternalFetchClient.FetchClient<FxTwitterResponse>(
            logger,
            requestUrl,
            _httpClient,
            "FxTwitter",
            _externalOptions.UserAgent,
            cancellationToken
        );

        if (response?.User is null)
        {
            return null;
        }

        return new FxTwitterProfile()
        {
            AvatarUrl = FixUrl(response.User.AvatarUrl ?? ""),
            BannerUrl = response.User.BannerUrl,
            Description = response.User.Description ?? "",
        };
    }
}

public sealed class FxTwitterProfile
{
    [JsonPropertyName("banner_url")]
    public required string BannerUrl { get; init; }

    [JsonPropertyName("avatar_url")]
    public required string AvatarUrl { get; init; }

    [JsonPropertyName("description")]
    public required string Description { get; init; }
}

public sealed class FxTwitterResponse
{
    public FxTwitterProfile? User { get; init; }
}
