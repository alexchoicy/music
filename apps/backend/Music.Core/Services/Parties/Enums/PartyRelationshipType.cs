using System.Text.Json.Serialization;

namespace Music.Core.Services.Parties.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PartyRelationshipType
{
    /// <summary>The source party is a member of the target group or project.</summary>
    MemberOf = 0,

    /// <summary>The source performer voices the target character.</summary>
    VoiceActorOf = 1,

    /// <summary>The source party is affiliated with the target company or organization.</summary>
    AffiliatedWith = 2,
}
