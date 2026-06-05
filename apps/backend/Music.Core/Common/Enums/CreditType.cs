using System.Text.Json.Serialization;

namespace Music.Core.Common.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CreditType
{
    Artist,
}
