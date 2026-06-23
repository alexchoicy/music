using System.Text.Json.Serialization;

namespace Music.Core.Services.Concerts.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ConcertPartyRole
{
    MainArtist,
    Guest,
}
