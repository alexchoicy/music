using System.Text.Json.Serialization;

namespace Music.Core.Services.Files.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FileType
{
    Image,
    Audio,
    Video,
    Document,
}
