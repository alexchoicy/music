using Microsoft.Extensions.Options;
using Music.Core.Common.Utils;
using Music.Core.Options;
using Music.Core.Storage;

namespace Music.Infrastructure.Services.External;

public class PartyAvatarService(
    IHttpClientFactory httpClientFactory,
    IOptions<StorageOptions> storageOptions
)
{
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();
    private readonly StorageOptions _storageOptions = storageOptions.Value;

    private static string BuildAppleMusicUnavatarUrl(string appleMusicId)
    {
        return $"https://unavatar.io/apple-music/artist:{Uri.EscapeDataString(appleMusicId)}";
    }

    public async Task<(string?, string?)> GetAppleMusicAvatarUrlAsync(
        string appleMusicId,
        CancellationToken cancellationToken = default
    )
    {
        string url = BuildAppleMusicUnavatarUrl(appleMusicId);
        return await SaveImageFileToTempDir(url, cancellationToken);
    }

    public async Task<(string?, string?)> SaveImageFileToTempDir(
        string url,
        CancellationToken cancellationToken = default
    )
    {
        using HttpRequestMessage request = new(HttpMethod.Get, url);
        using HttpResponseMessage response = await _httpClient.SendAsync(request, cancellationToken);

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
