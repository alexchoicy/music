using System.Text.Json.Serialization;

namespace Music.Core.Domain.Concerts.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ConcertPartyRole
{
    MainArtist,
    Guest,
}
