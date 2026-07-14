using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace Music.Infrastructure.Discord;

public sealed class DiscordExternalAssetService(
    IHttpClientFactory httpClientFactory,
    ILogger<DiscordExternalAssetService> logger
)
{
    private const int MaxCacheEntries = 2048;
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromHours(4);

    private readonly Lock _lock = new();
    private readonly Dictionary<AssetKey, CacheEntry> _cache = [];
    private readonly Dictionary<AssetKey, Task<string?>> _inFlight = [];

    public async Task<string?> GetMediaProxyPathAsync(
        string applicationId,
        string token,
        string userId,
        string? image,
        CancellationToken cancellationToken
    )
    {
        if (
            string.IsNullOrWhiteSpace(image)
            || image.StartsWith("mp:", StringComparison.Ordinal)
            || !Uri.TryCreate(image, UriKind.Absolute, out Uri? imageUrl)
            || (
                imageUrl.Scheme != Uri.UriSchemeHttp
                && imageUrl.Scheme != Uri.UriSchemeHttps
            )
        )
        {
            return image;
        }

        var key = new AssetKey(applicationId, image);
        TaskCompletionSource<string?>? completion = null;
        Task<string?> requestTask;
        lock (_lock)
        {
            if (_cache.TryGetValue(key, out CacheEntry? entry))
            {
                if (entry.ExpiresAt > DateTimeOffset.UtcNow)
                {
                    return entry.Path;
                }

                _cache.Remove(key);
            }

            if (!_inFlight.TryGetValue(key, out requestTask!))
            {
                completion = new(TaskCreationOptions.RunContinuationsAsynchronously);
                requestTask = completion.Task;
                _inFlight.Add(key, requestTask);
            }
        }

        if (completion is not null)
        {
            _ = CompleteRegistrationAsync(
                key,
                token,
                userId,
                completion,
                cancellationToken
            );
        }

        return await requestTask.WaitAsync(cancellationToken);
    }

    private async Task CompleteRegistrationAsync(
        AssetKey key,
        string token,
        string userId,
        TaskCompletionSource<string?> completion,
        CancellationToken cancellationToken
    )
    {
        try
        {
            string? path = await RegisterExternalAssetAsync(
                key,
                token,
                userId,
                cancellationToken
            );
            if (path is not null)
            {
                lock (_lock)
                {
                    PruneCache();
                    _cache[key] = new CacheEntry(path, DateTimeOffset.UtcNow + CacheLifetime);
                }
            }

            completion.TrySetResult(path);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            completion.TrySetCanceled(cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                exception,
                "Discord artwork proxy failed for user {UserId}.",
                userId
            );
            completion.TrySetResult(null);
        }
        finally
        {
            lock (_lock)
            {
                _inFlight.Remove(key);
            }
        }
    }

    private async Task<string?> RegisterExternalAssetAsync(
        AssetKey key,
        string token,
        string userId,
        CancellationToken cancellationToken
    )
    {
        try
        {
            for (int attempt = 0; attempt < 2; attempt++)
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Post,
                    $"https://discord.com/api/v9/applications/{key.ApplicationId}/external-assets"
                )
                {
                    Content = JsonContent.Create(new { urls = new[] { key.ImageUrl } }),
                };
                request.Headers.TryAddWithoutValidation("Authorization", token);

                using HttpResponseMessage response = await httpClientFactory
                    .CreateClient()
                    .SendAsync(request, cancellationToken);
                if (response.StatusCode == HttpStatusCode.TooManyRequests && attempt == 0)
                {
                    await Task.Delay(
                        await GetRetryDelayAsync(response, cancellationToken),
                        cancellationToken
                    );
                    continue;
                }

                if (!response.IsSuccessStatusCode)
                {
                    logger.LogWarning(
                        "Discord artwork proxy failed for user {UserId} with status {StatusCode}.",
                        userId,
                        response.StatusCode
                    );
                    return null;
                }

                ExternalAssetResponse[]? assets = await response.Content.ReadFromJsonAsync<
                    ExternalAssetResponse[]
                >(cancellationToken);
                string? path = assets?.FirstOrDefault()?.Path;
                return string.IsNullOrWhiteSpace(path) ? null : $"mp:{path}";
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
            when (exception is HttpRequestException or JsonException or TaskCanceledException)
        {
            logger.LogWarning(
                exception,
                "Discord artwork proxy failed for user {UserId}.",
                userId
            );
        }

        return null;
    }

    private static async Task<TimeSpan> GetRetryDelayAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken
    )
    {
        if (response.Headers.RetryAfter?.Delta is TimeSpan delay)
        {
            return delay;
        }

        if (response.Headers.RetryAfter?.Date is DateTimeOffset retryAt)
        {
            return TimeSpan.FromTicks(Math.Max(0, (retryAt - DateTimeOffset.UtcNow).Ticks));
        }

        try
        {
            using JsonDocument document = await JsonDocument.ParseAsync(
                await response.Content.ReadAsStreamAsync(cancellationToken),
                cancellationToken: cancellationToken
            );
            if (
                document.RootElement.TryGetProperty("retry_after", out JsonElement retryAfter)
                && retryAfter.TryGetDouble(out double seconds)
            )
            {
                return TimeSpan.FromSeconds(Math.Max(0, seconds));
            }
        }
        catch (JsonException) { }

        return TimeSpan.FromSeconds(1);
    }

    private void PruneCache()
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        foreach (
            AssetKey key in _cache
                .Where(entry => entry.Value.ExpiresAt <= now)
                .Select(entry => entry.Key)
                .ToArray()
        )
        {
            _cache.Remove(key);
        }

        if (_cache.Count >= MaxCacheEntries)
        {
            _cache.Remove(_cache.MinBy(entry => entry.Value.ExpiresAt).Key);
        }
    }

    private sealed record CacheEntry(string Path, DateTimeOffset ExpiresAt);

    private readonly record struct AssetKey(string ApplicationId, string ImageUrl);

    private sealed record ExternalAssetResponse(
        [property: JsonPropertyName("external_asset_path")] string? Path
    );
}
