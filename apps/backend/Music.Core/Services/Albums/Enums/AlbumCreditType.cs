using System.Text.Json.Serialization;

namespace Music.Core.Services.Albums.Enums;

// Primary peoples in the album
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AlbumCreditType
{
    Artist,
}
