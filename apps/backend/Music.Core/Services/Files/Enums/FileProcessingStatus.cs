using System.Text.Json.Serialization;

namespace Music.Core.Services.Files.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FileProcessingStatus
{
    Pending,
    Processing,
    Completed,
    Failed,
    Uploaded,
}
