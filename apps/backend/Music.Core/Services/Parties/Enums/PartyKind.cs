using System.Text.Json.Serialization;

namespace Music.Core.Services.Parties.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PartyKind
{
    Human = 0,
    VTuber = 1,
    VocaloidCreator = 2,
    VoiceSynth = 4,
}
