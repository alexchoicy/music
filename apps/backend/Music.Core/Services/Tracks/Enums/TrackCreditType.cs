using System.Text.Json.Serialization;

namespace Music.Core.Services.Tracks.Enums;

// Primary peoples in the album
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TrackCreditType
{
    Artist,
}
