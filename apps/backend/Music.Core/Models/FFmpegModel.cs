using System.Text.Json.Serialization;

namespace Music.Core.Models;

public sealed class MediaProbeResult
{
    [JsonPropertyName("format")]
    public ProbeFormat? Format { get; init; }

    [JsonPropertyName("streams")]
    public IReadOnlyList<ProbeStream>? Streams { get; init; }

}

public sealed class ProbeStream
{
    [JsonPropertyName("index")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int Index { get; init; }

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

    [JsonPropertyName("r_frame_rate")]
    public string RFrameRate { get; init; } = string.Empty; // convert it with support function to rounded fps

    [JsonPropertyName("tags")]
    public ProbeStreamTags? Tags { get; init; }
}

public sealed class ProbeFormat
{
    [JsonPropertyName("bit_rate")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int BitRate { get; init; }
}

public sealed class ProbeStreamTags
{
    [JsonPropertyName("language")]
    public string? Language { get; init; }

    [JsonPropertyName("title")]
    public string? Title { get; init; }
}
