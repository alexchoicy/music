using System.Text.Json.Serialization;

namespace Music.Core.Services.Extras.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ExtraCategory
{
    Booklet = 0,
    Packaging,
    Insert, // message card, lyric card, postcard
    Bonus, // store bonus, bonus audio/video
    Other = 99,
}
