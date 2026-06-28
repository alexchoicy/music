using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Music.Core.Common.Utils;
using Music.Core.Options;
using Music.Core.Storage;

namespace Music.Infrastructure.Services.External;

public partial class PartyAvatarService(
    IHttpClientFactory httpClientFactory,
    IOptions<StorageOptions> storageOptions
)
{
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();
    private readonly StorageOptions _storageOptions = storageOptions.Value;

    private static readonly string BrowserLikeUserAgent =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/537.36";

    private static readonly string AppleArtistUrl = "https://music.apple.com/artist/";

    [GeneratedRegex(
        """<meta\b(?=[^>]*\bproperty\s*=\s*["']og:image["'])[^>]*\bcontent\s*=\s*["'](?<url>https://(?:[a-z0-9-]+\.)*mzstatic\.com/image/thumb/[^"']+)["']""",
        RegexOptions.IgnoreCase
    )]
    private static partial Regex AppleArtworkUrlRegex();

    private async Task<string?> GetAppleMusicAvatarUrlAsync(
        string appleMusicId,
        CancellationToken cancellationToken = default
    )
    {
        using HttpRequestMessage request = new(
            HttpMethod.Get,
            $"{AppleArtistUrl}{Uri.EscapeDataString(appleMusicId)}"
        );
        request.Headers.UserAgent.ParseAdd(BrowserLikeUserAgent);
        using HttpResponseMessage response = await _httpClient.SendAsync(
            request,
            cancellationToken
        );

        if (!response.IsSuccessStatusCode)
        {
            return null;
        }
        string html = await response.Content.ReadAsStringAsync(cancellationToken);
        Match match = AppleArtworkUrlRegex().Match(html);
        return match.Success
            ? match.Groups["url"].Value.Replace("/1200x630cw.png", "/3000x3000bb.jpg")
            : null;
    }

    public async Task<(string?, string?)> GetAppleMusicAvatarAsync(
        string appleMusicId,
        CancellationToken cancellationToken = default
    )
    {
        string? url = await GetAppleMusicAvatarUrlAsync(appleMusicId, cancellationToken);
        if (url is null)
        {
            return (null, null);
        }

        return await SaveImageFileToTempDir(url, cancellationToken);
    }

    public async Task<(string?, string?)> SaveImageFileToTempDir(
        string url,
        CancellationToken cancellationToken = default
    )
    {
        using HttpRequestMessage request = new(HttpMethod.Get, url);
        using HttpResponseMessage response = await _httpClient.SendAsync(
            request,
            cancellationToken
        );

        if (!response.IsSuccessStatusCode)
        {
            return (null, null);
        }

        string mimeType =
            response.Content.Headers.ContentType?.MediaType?.Trim().ToLowerInvariant()
            ?? "image/jpeg";

        if (!mimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return (null, null);
        }

        string extension = MediaFiles.GetExtensionFromMimeType(mimeType, "");

        Directory.CreateDirectory(_storageOptions.TempDir);
        string tempPath = Path.Combine(
            _storageOptions.TempDir,
            $"party_external_{Guid.NewGuid()}.{extension}"
        );

        await using (FileStream fileStream = File.Create(tempPath))
        {
            await response.Content.CopyToAsync(fileStream, cancellationToken);
        }

        return (tempPath, mimeType);
    }
}
