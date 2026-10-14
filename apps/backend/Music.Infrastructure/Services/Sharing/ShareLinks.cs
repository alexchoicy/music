using Music.Core.Options;

namespace Music.Infrastructure.Services.Sharing;

// Public links to web pages, built from the configured web URL so shares do not
// depend on the address a client happened to use.
internal static class ShareLinks
{
    public static string Album(BaseOptions options, int albumId) =>
        $"{options.WebUrl.TrimEnd('/')}/albums/{albumId}";

    public static string Concert(BaseOptions options, int concertId) =>
        $"{options.WebUrl.TrimEnd('/')}/concerts/{concertId}";
}
