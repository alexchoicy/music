using System.Text.Json.Serialization;

namespace Music.Core.Services.Subtitles;

public sealed class ParsedLyrics
{
    public IReadOnlyList<LyricSinger> Singers { get; init; } = [];
    public required IReadOnlyList<LyricLine> Lines { get; init; } = [];
}

public sealed class LyricSinger
{
    public required string Id { get; init; }
    public string? Name { get; init; }
    public required LyricSingerKind Kind { get; init; }
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum LyricSingerKind
{
    Person,
    Group,
    Other,
}

public sealed class LyricLine
{
    public required double Start { get; init; }
    public required double End { get; init; }
    public required string Text { get; init; }

    public IReadOnlyList<string> Singers { get; init; } = [];
    public IReadOnlyList<LyricWord> Words { get; init; } = [];
    public string? Background { get; init; }
    public IReadOnlyList<LyricText> Translations { get; init; } = [];
    public IReadOnlyList<LyricText> Romanizations { get; init; } = [];
}

public sealed class LyricWord
{
    public required double Start { get; init; }
    public double? End { get; init; }
    public required string Text { get; init; }
}

public sealed class LyricText
{
    public required string Text { get; init; }
    public string? Lang { get; init; }
}
