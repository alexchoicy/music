using Music.Core.Models;

namespace Music.Core.Utils;

public static class ProbeHelper
{
    public static ProbeStream GetPrimaryVideoStream(MediaProbeResult probe)
    {
        return probe.Streams?
            .Where(s => string.Equals(s.CodecType, "video", StringComparison.OrdinalIgnoreCase))
            .Where(s => s.Disposition?.AttachedPic != 1)
            .OrderBy(s => s.Index)
            .FirstOrDefault()
            ?? throw new InvalidOperationException("No real video stream found.");
    }

    public static List<ProbeStream> GetAudioStreams(MediaProbeResult probe)
    {
        return probe.Streams?
            .Where(s => string.Equals(s.CodecType, "audio", StringComparison.OrdinalIgnoreCase))
            .OrderBy(GetDashAudioSortWeight)
            .ThenBy(s => s.Index)
            .ToList()
            ?? [];
    }

    // sort by stereo
    // becuase in firefox 5.1 -> stereo will don't have audio
    // but stereo -> 5.1 work fine
    private static int GetDashAudioSortWeight(ProbeStream stream)
    {
        return MediaFiles.NormalizeChannels(stream.Channels) == 2 ? 0 : 1;
    }
}
