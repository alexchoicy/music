
using System.Collections.Immutable;
using System.Globalization;
using Music.Core.Models;

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
            { "audio/opus", "opus" },

            { "video/mp4", "mp4" },
            { "video/webm", "webm" },
            { "video/x-matroska", "mkv" },
            { "video/matroska", "mkv" },
            { "application/dash+xml", "mpd" },
            { "text/vtt", "vtt" },
            { "application/x-pgs", "sup" }
    });

    public static bool ShouldTranscodeToOpus96(int bitrate)
    {
        const int threshold = 96_000;
        return bitrate is > threshold;
    }

    public static double? ParseFrameRate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        string[] parts = value.Split('/', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        if (parts.Length == 1
            && double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out double single))
        {
            return single > 0 ? single : null;
        }

        if (parts.Length == 2
            && double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out double num)
            && double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out double den)
            && den != 0)
        {
            double fps = num / den;
            return fps > 0 ? fps : null;
        }

        return null;
    }
}
