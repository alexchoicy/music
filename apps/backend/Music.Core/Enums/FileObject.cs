using System.Text.Json.Serialization;

namespace Music.Core.Enums;

public enum FileObjectType
{
    Original,
    Thumbnail,
    Transcoded,
    Cropped // <-- display this for cover/banner.
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FileObjectVariant
{ // this thing is for UI
    Original,
    CroppedOriginal,
    Cover600,
    Banner1200x400,
    Thumbnail640x360,
    Opus96, //this is enough
}

public enum FileProcessingStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}
