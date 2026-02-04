using System.Text.Json.Serialization;
using Music.Core.Enums;

namespace Music.Api.Dtos.Requests;

public sealed class CreatePartyRequest
{
    public required string Name { get; init; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required PartyType PartyType { get; init; }

    public int LanguageId { get; init; }
}
