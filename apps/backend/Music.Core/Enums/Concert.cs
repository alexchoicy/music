using System.Text.Json.Serialization;

namespace Music.Core.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ConcertPartyRole
{
    MainArtist,
    Guest,
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ConcertFileType
{
    Performance,
    BehindTheScenes,
    Extra,
    Other,
}
