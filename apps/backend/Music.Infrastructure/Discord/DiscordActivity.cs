using System.Text.Json.Serialization;

namespace Music.Infrastructure.Discord;

public sealed record DiscordActivity
{
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    [JsonPropertyName("type")]
    public required DiscordActivityType Type { get; init; }

    [JsonPropertyName("url")]
    public string? Url { get; init; }

    [JsonPropertyName("application_id")]
    public string? ApplicationId { get; init; }

    [JsonPropertyName("status_display_type")]
    public DiscordStatusDisplayType? StatusDisplayType { get; init; }

    [JsonPropertyName("details")]
    public string? Details { get; init; }

    [JsonPropertyName("details_url")]
    public string? DetailsUrl { get; init; }

    [JsonPropertyName("state")]
    public string? State { get; init; }

    [JsonPropertyName("state_url")]
    public string? StateUrl { get; init; }

    [JsonPropertyName("timestamps")]
    public DiscordActivityTimestamps? Timestamps { get; init; }

    [JsonPropertyName("assets")]
    public DiscordActivityAssets? Assets { get; init; }

    [JsonPropertyName("buttons")]
    public IReadOnlyList<string>? Buttons { get; init; }

    [JsonPropertyName("flags")]
    public int? Flags { get; init; }
}

public sealed record DiscordActivityTimestamps
{
    [JsonPropertyName("start")]
    public long? Start { get; init; }

    [JsonPropertyName("end")]
    public long? End { get; init; }
}

public sealed record DiscordActivityAssets
{
    [JsonPropertyName("large_image")]
    public string? LargeImage { get; init; }

    [JsonPropertyName("large_text")]
    public string? LargeText { get; init; }

    [JsonPropertyName("large_url")]
    public string? LargeUrl { get; init; }

    [JsonPropertyName("small_image")]
    public string? SmallImage { get; init; }

    [JsonPropertyName("small_text")]
    public string? SmallText { get; init; }

    [JsonPropertyName("small_url")]
    public string? SmallUrl { get; init; }
}

public enum DiscordActivityType
{
    Playing,
    Streaming,
    Listening,
    Watching,
    Custom,
    Competing,
    Hang,
}

public enum DiscordStatusDisplayType
{
    Name,
    State,
    Details,
}
