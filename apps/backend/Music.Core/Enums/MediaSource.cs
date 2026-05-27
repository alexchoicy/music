using System.Text.Json.Serialization;

namespace Music.Core.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum MediaSource
{
    Unknown = 0,
    UserUpload,
    MORA,
    OTOTOY,
    CD,
    BluRay,
    Vinyl,
    YouTube,
    SoundCloud,
    Spotify,
    Twitter,
    Other = 99,
}
