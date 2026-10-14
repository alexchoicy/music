using System.Text.Json.Serialization;

namespace Music.Core.Services.Auth.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AuthClient
{
    Web,
    App,
}
