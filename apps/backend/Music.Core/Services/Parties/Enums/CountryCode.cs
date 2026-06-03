using System.Text.Json.Serialization;

namespace Music.Core.Services.Parties.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CountryCode
{
    XX,
    HK,
    JP,
    KR,
    US,
    CN,
    TW,
}
