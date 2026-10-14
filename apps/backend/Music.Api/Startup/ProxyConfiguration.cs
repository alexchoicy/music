using System.Net;
using Microsoft.AspNetCore.HttpOverrides;

namespace Music.Api.Startup;

public static class ProxyConfiguration
{
    public static void Configure(IServiceCollection services, IConfiguration configuration)
    {
        IConfigurationSection section = configuration.GetSection("ReverseProxy");
        int forwardLimit = section.GetValue<int?>("ForwardLimit") ?? 1;
        if (forwardLimit < 1)
        {
            throw new InvalidOperationException("ReverseProxy:ForwardLimit must be positive.");
        }

        // Parse before building the host so invalid proxy configuration fails before startup jobs.
        IPAddress[] proxies = (section.GetSection("KnownProxies").Get<string[]>() ?? [])
            .Select(IPAddress.Parse)
            .ToArray();
        System.Net.IPNetwork[] networks = (
            section.GetSection("KnownNetworks").Get<string[]>() ?? []
        )
            .Select(System.Net.IPNetwork.Parse)
            .ToArray();
        if (networks.Any(network => network.PrefixLength == 0))
        {
            throw new InvalidOperationException(
                "ReverseProxy:KnownNetworks must not trust all IPs."
            );
        }

        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders =
                ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.ForwardLimit = forwardLimit;

            // Keep the framework's loopback defaults; empty configuration must never trust everyone.
            foreach (IPAddress proxy in proxies)
            {
                options.KnownProxies.Add(proxy);
            }
            foreach (System.Net.IPNetwork network in networks)
            {
                options.KnownIPNetworks.Add(network);
            }
        });
    }
}
