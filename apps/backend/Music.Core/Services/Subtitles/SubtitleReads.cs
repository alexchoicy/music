using Music.Core.Services.Subtitles.Enums;

namespace Music.Core.Services.Subtitles;

public sealed class SubtitleSummary
{
    public required int SubtitleId { get; init; }
    public string? Title { get; init; }
    public required SubtitleFormat Format { get; init; }
    public int? LanguageId { get; init; }
    public string? LanguageName { get; init; }
    public required int Order { get; init; }
}

public sealed class SubtitleLyrics
{
    public required int SubtitleId { get; init; }
    public required SubtitleFormat Format { get; init; }
    public int? LanguageId { get; init; }

    public ParsedLyrics? Parsed { get; init; }

    public string? PlainText { get; init; }
}

public sealed class SubtitleDetails
{
    public required int SubtitleId { get; init; }
    public string? Title { get; init; }
    public required SubtitleFormat Format { get; init; }
    public int? LanguageId { get; init; }
    public string? LanguageName { get; init; }
    public required string Content { get; init; }
    public ParsedLyrics? Parsed { get; init; }
    public required int Order { get; init; }
    public required uint Version { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }
}
