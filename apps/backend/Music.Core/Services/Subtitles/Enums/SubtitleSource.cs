using System.Text.Json.Serialization;

namespace Music.Core.Services.Subtitles.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SubtitleSource
{
    AmllTtmlDb = 0,
    LrcRed,
    SyncLrc,
    Other = 99,
}
