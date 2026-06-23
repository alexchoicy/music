using System.Text.Json.Serialization;

namespace Music.Core.Services.Albums.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AlbumType
{
    Album,
    Single,
    Compilation,
    Live,
    Soundtrack,
    Remix,
    Other = 99,
}
