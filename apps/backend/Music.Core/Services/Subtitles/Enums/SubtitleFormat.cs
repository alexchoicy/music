using System.Text.Json.Serialization;

namespace Music.Core.Services.Subtitles.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SubtitleFormat
{
    PlainText = 0,
    Vtt,
    Srt,
    Lrc,
    Ass,
    Ttml,
}
