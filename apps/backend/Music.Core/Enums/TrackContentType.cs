using System.Text.Json.Serialization;

namespace Music.Core.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TrackContentType
{
    Music = 0,
    MC,
    Interlude,
}