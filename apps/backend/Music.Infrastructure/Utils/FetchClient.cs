using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Music.Infrastructure.Utils;

public static class ExternalFetchClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public static async Task<T?> FetchClient<T>(
        ILogger logger,
        string requestUri,
        HttpClient httpClient,
        string providerName = "External provider",
        string userAgent = "",
        CancellationToken cancellationToken = default
    )
    {
        const int maxRetries = 3;
        const int delayMs = 250;
        const int retryDelayMs = 500;

        try
        {
            for (int attempt = 0; attempt <= maxRetries; attempt++)
            {
                await Task.Delay(delayMs, cancellationToken);
                using HttpRequestMessage request = new(HttpMethod.Get, requestUri);
                request.Headers.TryAddWithoutValidation("User-Agent", userAgent);
                request.Headers.TryAddWithoutValidation("Accept", "application/json");

                using HttpResponseMessage response = await httpClient.SendAsync(
                    request,
                    cancellationToken
                );

                if (response.IsSuccessStatusCode)
                {
                    await using Stream responseStream = await response.Content.ReadAsStreamAsync(
                        cancellationToken
                    );
                    return await JsonSerializer.DeserializeAsync<T>(
                        responseStream,
                        JsonOptions,
                        cancellationToken
                    );
                }

                if (
                    response.StatusCode
                    is HttpStatusCode.ServiceUnavailable
                        or HttpStatusCode.TooManyRequests
                )
                {
                    if (attempt < maxRetries)
                    {
                        await Task.Delay(retryDelayMs, cancellationToken);
                        continue;
                    }

                    logger.LogWarning(
                        "{ProviderName} request failed with status {StatusCode} after retries: {RequestUri}",
                        providerName,
                        (int)response.StatusCode,
                        requestUri
                    );
                    return default;
                }

                if (response.StatusCode == HttpStatusCode.NotFound)
                {
                    return default;
                }

                logger.LogWarning(
                    "{ProviderName} request failed with status {StatusCode}: {RequestUri}",
                    providerName,
                    (int)response.StatusCode,
                    requestUri
                );
                return default;
            }
        }
        catch (JsonException exception)
        {
            logger.LogWarning(
                exception,
                "{ProviderName} returned invalid JSON: {RequestUri}",
                providerName,
                requestUri
            );
        }
        catch (HttpRequestException exception)
        {
            logger.LogWarning(
                exception,
                "{ProviderName} request failed: {RequestUri}",
                providerName,
                requestUri
            );
        }
        catch (OperationCanceledException exception) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(
                exception,
                "{ProviderName} request timed out: {RequestUri}",
                providerName,
                requestUri
            );
        }

        return default;
    }
}
