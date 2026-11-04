using System.ComponentModel.DataAnnotations;
using Music.Core.Services.Subtitles.Enums;

namespace Music.Core.Services.Subtitles.Requests;

public sealed class CreateSubtitleRequest
{
    [MaxLength(250)]
    public string? Title { get; init; }

    [EnumDataType(typeof(SubtitleFormat))]
    public required SubtitleFormat Format { get; init; }

    public int? LanguageId { get; init; }

    [Required(AllowEmptyStrings = false)]
    public required string Content { get; init; }

    public ParsedLyrics? Parsed { get; init; }
}

public sealed class UpdateSubtitleRequest
{
    [MaxLength(250)]
    public string? Title { get; init; }

    [EnumDataType(typeof(SubtitleFormat))]
    public required SubtitleFormat Format { get; init; }

    public int? LanguageId { get; init; }

    [Required(AllowEmptyStrings = false)]
    public required string Content { get; init; }

    public ParsedLyrics? Parsed { get; init; }

    public required uint Version { get; init; }
}
