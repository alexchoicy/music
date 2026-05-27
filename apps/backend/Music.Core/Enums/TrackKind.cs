using System.Text.Json.Serialization;

namespace Music.Core.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TrackKind
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
