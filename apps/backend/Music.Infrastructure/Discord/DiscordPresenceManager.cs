using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Music.Infrastructure.Discord;

public sealed class DiscordPresenceManager(
    IHttpClientFactory httpClientFactory,
    DiscordExternalAssetService externalAssetService,
    IConfiguration configuration,
    ILoggerFactory loggerFactory
) : IAsyncDisposable
{
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
    private readonly DiscordExternalAssetService _externalAssetService = externalAssetService;
    private readonly IConfiguration _configuration = configuration;
    private readonly string? _applicationId = configuration["Discord:ApplicationId"];
    private readonly ILoggerFactory _loggerFactory = loggerFactory;
    private readonly Lock _lock = new();

    private readonly Dictionary<string, DiscordGatewayClient> _clients = [];
    private bool _disposed;

    public bool QueuePresenceUpdate(string userId, DiscordActivity activity)
    {
        string? targetUserId = _configuration["Discord:TargetUser"];
        string? userToken = _configuration["Discord:UserToken"];

        if (
            string.IsNullOrWhiteSpace(_applicationId)
            || string.IsNullOrWhiteSpace(targetUserId)
            || string.IsNullOrWhiteSpace(userToken)
        )
        {
            return false;
        }

        if (!string.Equals(userId, targetUserId, StringComparison.Ordinal))
        {
            return false;
        }

        lock (_lock)
        {
            if (_disposed)
            {
                return false;
            }

            if (!_clients.TryGetValue(userId, out DiscordGatewayClient? client))
            {
                client = new DiscordGatewayClient(
                    _httpClientFactory.CreateClient(),
                    _externalAssetService,
                    _applicationId,
                    userToken,
                    userId,
                    _loggerFactory.CreateLogger<DiscordGatewayClient>()
                );
                _clients.Add(userId, client);
            }

            return client.QueuePresenceUpdate(activity);
        }
    }

    public bool QueueClearPresence(string userId)
    {
        lock (_lock)
        {
            return !_disposed
                && _clients.TryGetValue(userId, out DiscordGatewayClient? client)
                && client.QueueClearPresence();
        }
    }

    public async ValueTask DisposeAsync()
    {
        DiscordGatewayClient[] clients;
        lock (_lock)
        {
            _disposed = true;
            clients = _clients.Values.ToArray();
            _clients.Clear();
        }

        foreach (DiscordGatewayClient client in clients)
        {
            await client.DisposeAsync();
        }
    }
}
