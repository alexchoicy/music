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

    [JsonPropertyName("codec_long_name")]
    public string? CodecLongName { get; init; }

    [JsonPropertyName("codec_name")]
    public string? CodecName { get; init; }

    [JsonPropertyName("codec_type")]
    public string? CodecType { get; init; }

    [JsonPropertyName("profile")]
    public string? Profile { get; init; }

    [JsonPropertyName("width")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int? Width { get; init; }

    [JsonPropertyName("height")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int? Height { get; init; }

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
    public Dictionary<string, string>? Tags { get; init; }

    [JsonPropertyName("disposition")]
    public ProbeDisposition? Disposition { get; init; }

    [JsonPropertyName("field_order")]
    public string? FieldOrder { get; init; }

    [JsonPropertyName("avg_frame_rate")]
    public string? AvgFrameRate { get; init; }

    [JsonPropertyName("channel_layout")]
    public string? ChannelLayout { get; init; }
}

public sealed class ProbeFormat
{
    [JsonPropertyName("filename")]
    public string? FileName { get; init; }

    [JsonPropertyName("bit_rate")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int BitRate { get; init; }

    [JsonPropertyName("duration")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public double? Duration { get; init; }

    [JsonPropertyName("tags")]
    public Dictionary<string, string>? Tags { get; init; }
}

public sealed class ProbeDisposition
{
    [JsonPropertyName("default")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int Default { get; init; }

    [JsonPropertyName("attached_pic")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int AttachedPic { get; init; }
}
