using System.Text.Json.Serialization;

namespace Music.Core.Domain.Parties.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PartyType
{
    Individual,
    Group,
    Project,
}
