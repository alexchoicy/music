
using System.Collections.Immutable;

namespace Music.Core.Utils;

public static class MediaFiles
{
    public static readonly ImmutableDictionary<string, string> MimeToExt =
    ImmutableDictionary.CreateRange(new Dictionary<string, string>
    {
            { "image/jpeg", "jpg" },
            { "image/png",  "png" },

            { "audio/mpeg", "mp3" },
            { "audio/flac", "flac" },
            { "audio/wav",  "wav" },
            { "audio/ogg",  "ogg" },
    });
}