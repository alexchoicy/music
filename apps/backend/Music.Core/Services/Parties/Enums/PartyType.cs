using System.Text.Json.Serialization;

namespace Music.Core.Services.Parties.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PartyType
{
    Individual,
    Group,
    Project,
}
