namespace Music.Core.Models;

public sealed class MusicBrainzOptions
{
    public required string UserAgent { get; init; }
}

public sealed class TwitterOptions
{
    public string? BearerToken { get; init; }
}

public sealed class ExternalOptions
{
    public MusicBrainzOptions MusicBrainz { get; init; } = new()
    {
        UserAgent = "Application MusicApp/0.0.1 (https://github.com/example/music)"
    };

    public TwitterOptions Twitter { get; init; } = new();
}
