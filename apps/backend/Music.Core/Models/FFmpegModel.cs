using System.Text.Json.Serialization;

namespace Music.Core.Models;

public sealed class MediaProbeResult
{
    [JsonPropertyName("format")]
    public ProbeFormat? Format { get; init; }

    [JsonPropertyName("streams")]
    public IReadOnlyList<ProbeStream>? Streams { get; init; }

    public IReadOnlyList<ProbeStream> GetAudioStreams()
    {
        return Streams?.Where(s => s.CodecType == "audio").ToList() ?? [];
    }
}

public sealed class ProbeStream
{
    [JsonPropertyName("codec_name")]
    public string? CodecName { get; init; }

    [JsonPropertyName("codec_type")]
    public string? CodecType { get; init; }

    [JsonPropertyName("channels")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int? Channels { get; init; }

    [JsonPropertyName("sample_rate")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int? SampleRate { get; init; }

    [JsonPropertyName("duration")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public double? Duration { get; init; }
}

public sealed class ProbeFormat
{
    [JsonPropertyName("bit_rate")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int BitRate { get; init; }
}
