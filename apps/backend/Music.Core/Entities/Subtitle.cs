using Music.Core.Services.Subtitles.Enums;

namespace Music.Core.Entities;

public class Subtitle
{
    public int Id { get; set; }

    public int? TrackId { get; set; }
    public Track? Track { get; set; }

    public int? ConcertFileId { get; set; }
    public ConcertFile? ConcertFile { get; set; }

    public string? Title { get; set; }

    public SubtitleFormat Format { get; set; } = SubtitleFormat.PlainText;

    public int? LanguageId { get; set; }
    public Language? Language { get; set; }

    public required string Content { get; set; }

    public string? Parsed { get; set; }

    public int Order { get; set; } = 0;

    public string? CreatedByUserId { get; set; }

    public uint Version { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
