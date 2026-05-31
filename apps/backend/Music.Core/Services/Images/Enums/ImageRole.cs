using System.Text.Json.Serialization;

namespace Music.Core.Services.Images.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ImageRole
{
    Cover = 0,
    Avatar,
    Banner,
}
