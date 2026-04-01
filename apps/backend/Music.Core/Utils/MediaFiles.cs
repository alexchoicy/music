
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

    public static int? GetBestAvailableBitrate(ProbeStream? stream, ProbeFormat? format = null)
    {
        if (format?.BitRate is > 0)
        {
            return format.BitRate;
        }

        if (TryGetPositiveIntTag(stream, "BPS-eng", out int taggedBitrate)
            || TryGetPositiveIntTag(stream, "BPS", out taggedBitrate))
        {
            return taggedBitrate;
        }

        if (stream?.BitRate is > 0)
        {
            return stream.BitRate;
        }

        return null;
    }

    public static string BuildAudioTitle(ProbeStream stream)
    {
        string codecLong = stream.CodecLongName ?? stream.CodecName ?? "audio";
        string profile = stream.Profile ?? string.Empty;

        string codecLabel = string.IsNullOrWhiteSpace(profile)
            ? codecLong
            : $"{codecLong} - {profile}";

        string layout = BuildAudioLayoutName(stream);

        string incomingTitle = string.Empty;
        if (stream.Tags is not null
            && stream.Tags.TryGetValue("title", out string? title)
            && !string.IsNullOrWhiteSpace(title))
        {
            incomingTitle = title.Trim();
        }

        if (string.IsNullOrWhiteSpace(incomingTitle))
        {
            return $"{layout} ({codecLabel})";
        }

        if (incomingTitle.Contains(codecLabel, StringComparison.OrdinalIgnoreCase))
        {
            return incomingTitle;
        }

        return $"{incomingTitle} ({codecLabel})";
    }

    public static string BuildAudioLayoutName(ProbeStream stream)
    {
        if (!string.IsNullOrWhiteSpace(stream.ChannelLayout))
        {
            return stream.ChannelLayout;
        }

        return NormalizeChannels(stream.Channels) switch
        {
            1 => "Mono",
            2 => "Stereo",
            6 => "5.1",
            8 => "7.1",
            int channelCount => $"{channelCount}ch"
        };
    }

    public static int NormalizeChannels(int? channels)
    {
        if (channels is null || channels <= 0)
        {
            return 2;
        }

        return channels.Value;
    }

    public static string GetLanguage(ProbeStream stream)
    {
        if (stream.Tags is not null
            && stream.Tags.TryGetValue("language", out string? language)
            && !string.IsNullOrWhiteSpace(language))
        {
            return language.Trim();
        }

        return "und";
    }


    private static bool AreAllAudioCodecsAllowed(List<string> audioCodecs, IReadOnlyCollection<string> allowedCodecs)
    {
        return audioCodecs.Count == 0 || audioCodecs.All(allowedCodecs.Contains);
    }

    private static List<string> NormalizeCodecs(IEnumerable<string?> values)
    {
        return values
            .Select(NormalizeCodecFromFFprobe)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .ToList();
    }

    private static string NormalizeCodecFromFFprobe(string? value)
    {
        return (value ?? string.Empty).Trim().TrimStart('.').ToLowerInvariant();
    }

    private static bool TryGetPositiveIntTag(ProbeStream? stream, string key, out int value)
    {
        value = 0;

        return TryGetTagValue(stream, key, out string? tagValue)
            && int.TryParse(tagValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out value)
            && value > 0;
    }

    private static bool TryGetTagValue(ProbeStream? stream, string key, out string? value)
    {
        value = null;

        if (stream?.Tags is null)
        {
            return false;
        }

        foreach ((string tagKey, string tagValue) in stream.Tags)
        {
            if (string.Equals(tagKey, key, StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrWhiteSpace(tagValue))
            {
                value = tagValue.Trim();
                return true;
            }
        }

        return false;
    }


    private static readonly string[] Mp4SupportAudioCodecs = ["aac", "flac", "mp3"];
    private static readonly string[] Mp4SupportedVideoCodecs = ["h264", "hevc", "h265"];
    private static readonly string[] WebmAudioCodecs = ["opus"];
    private static readonly string[] WebmVideoCodecs = ["av1", "vp9"];

    public static bool CanRemuxVideoToMp4(string? videoCodec, IEnumerable<string?> audioCodecs)
    {
        return Mp4SupportedVideoCodecs.Contains(NormalizeCodecFromFFprobe(videoCodec))
            && AreAllAudioCodecsAllowed(NormalizeCodecs(audioCodecs), Mp4SupportAudioCodecs);
    }

    public static bool CanRemuxVideoToWebM(string? videoCodec, IEnumerable<string?> audioCodecs)
    {
        return WebmVideoCodecs.Contains(NormalizeCodecFromFFprobe(videoCodec))
            && AreAllAudioCodecsAllowed(NormalizeCodecs(audioCodecs), WebmAudioCodecs);
    }

}
