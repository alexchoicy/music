using System.Text.Json.Serialization;

namespace Music.Core.Services.Tracks.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TrackVersionType
{
    Original = 0,
    Instrumental,
    Remix,
    Live,
    Acoustic,
    RadioEdit,
    Demo,
    Other = 99,
}
