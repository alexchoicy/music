using System.Text.Json.Serialization;

namespace Music.Core.Domain.Files.Enums;

public enum FileObjectType
{
    Original,
    Thumbnail,
    Transcoded,
    Cropped, // <-- display this for cover/banner.
    GeneratedAsset,
}
