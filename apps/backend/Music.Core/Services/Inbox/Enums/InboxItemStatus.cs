using System.Text.Json.Serialization;

namespace Music.Core.Services.Inbox.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum InboxItemStatus
{
    Pending,
    Claimed,
    Discarded,
}
