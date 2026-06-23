using System.Text.Json.Serialization;

namespace Music.Core.Services.Files.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FileObjectVariant
{
    // General
    Original = 0,
    TaggedOriginal = 1,

    // Audio
    Opus96 = 100,
    WaveformB8Pixel20 = 101,

    // Video / Streaming
    OriginalDash = 200, //not used, lazy to config all different type of source container files.
    DashAV1 = 201,
    Thumbnail640x360 = 202,
    AttachedPicture = 203,
    SubtitleVtt = 204,
    SubtitleSup = 205,
    RemuxedOriginal = 206,

    // Images
    ImageCover1024x1024 = 301,
    ImageAvatar512x512 = 302,
    ImageBanner1500x500 = 303,
    ImageWide1280x720 = 304,
}
