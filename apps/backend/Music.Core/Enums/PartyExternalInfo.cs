using System.Text.Json.Serialization;

namespace Music.Core.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PartyExternalInfoType
{
    Spotify,
    Twitter,
}
