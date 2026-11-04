using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Music.Core.Common.Exceptions;
using Music.Core.Entities;
using Music.Core.Services.Subtitles;
using Music.Core.Services.Subtitles.Enums;
using Music.Core.Services.Subtitles.Requests;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Subtitles;

public sealed class SubtitleService(AppDbContext dbContext) : ISubtitleService
{
    private static readonly SubtitleFormat[] TrackFormats =
    [
        SubtitleFormat.Lrc,
        SubtitleFormat.Ttml,
        SubtitleFormat.PlainText,
    ];

    private static readonly SubtitleFormat[] ConcertFileFormats =
    [
        SubtitleFormat.Vtt,
        SubtitleFormat.Srt,
        SubtitleFormat.Ass,
        SubtitleFormat.Ttml,
    ];

    public async Task<SubtitleDetails> GetAsync(
        int subtitleId,
        CancellationToken cancellationToken = default
    )
    {
        Subtitle subtitle =
            await dbContext
                .Subtitles.AsNoTracking()
                .Include(subtitle => subtitle.Language)
                .FirstOrDefaultAsync(subtitle => subtitle.Id == subtitleId, cancellationToken)
            ?? throw new EntityNotFoundException($"Subtitle {subtitleId} not found");

        return new SubtitleDetails
        {
            SubtitleId = subtitle.Id,
            Title = subtitle.Title,
            Format = subtitle.Format,
            LanguageId = subtitle.LanguageId,
            LanguageName = subtitle.Language?.Name,
            Content = subtitle.Content,
            Parsed = subtitle.Parsed is null
                ? null
                : JsonSerializer.Deserialize<ParsedLyrics>(subtitle.Parsed, ParsedJsonOptions),
            Order = subtitle.Order,
            Version = subtitle.Version,
            CreatedAt = subtitle.CreatedAt,
            UpdatedAt = subtitle.UpdatedAt,
        };
    }

    public async Task<SubtitleLyrics> GetLyricsAsync(
        int subtitleId,
        CancellationToken cancellationToken = default
    )
    {
        var row =
            await dbContext
                .Subtitles.AsNoTracking()
                .Where(subtitle => subtitle.Id == subtitleId)
                .Select(subtitle => new
                {
                    subtitle.Id,
                    subtitle.Format,
                    subtitle.LanguageId,
                    subtitle.Parsed,
                    PlainText = subtitle.Format == SubtitleFormat.PlainText
                        ? subtitle.Content
                        : null,
                })
                .FirstOrDefaultAsync(cancellationToken)
            ?? throw new EntityNotFoundException($"Subtitle {subtitleId} not found");

        return new SubtitleLyrics
        {
            SubtitleId = row.Id,
            Format = row.Format,
            LanguageId = row.LanguageId,
            Parsed = row.Parsed is null
                ? null
                : JsonSerializer.Deserialize<ParsedLyrics>(row.Parsed, ParsedJsonOptions),
            PlainText = row.PlainText,
        };
    }

    public async Task<Dictionary<int, IReadOnlyList<SubtitleSummary>>> GetSummariesByTrackAsync(
        IReadOnlyCollection<int> trackIds,
        CancellationToken cancellationToken = default
    )
    {
        List<SummaryRow> rows = await QuerySummariesAsync(
            subtitle => subtitle.TrackId != null && trackIds.Contains(subtitle.TrackId.Value),
            cancellationToken
        );
        return GroupSummaries(rows, row => row.TrackId!.Value);
    }

    public async Task<
        Dictionary<int, IReadOnlyList<SubtitleSummary>>
    > GetSummariesByConcertFileAsync(
        IReadOnlyCollection<int> concertFileIds,
        CancellationToken cancellationToken = default
    )
    {
        List<SummaryRow> rows = await QuerySummariesAsync(
            subtitle =>
                subtitle.ConcertFileId != null
                && concertFileIds.Contains(subtitle.ConcertFileId.Value),
            cancellationToken
        );
        return GroupSummaries(rows, row => row.ConcertFileId!.Value);
    }

    private sealed record SummaryRow(int? TrackId, int? ConcertFileId, SubtitleSummary Summary);

    private async Task<List<SummaryRow>> QuerySummariesAsync(
        Expression<Func<Subtitle, bool>> predicate,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
            .Subtitles.AsNoTracking()
            .Where(predicate)
            .OrderBy(subtitle => subtitle.Order)
            .ThenBy(subtitle => subtitle.Id)
            .Select(subtitle => new SummaryRow(
                subtitle.TrackId,
                subtitle.ConcertFileId,
                new SubtitleSummary
                {
                    SubtitleId = subtitle.Id,
                    Title = subtitle.Title,
                    Format = subtitle.Format,
                    LanguageId = subtitle.LanguageId,
                    LanguageName = subtitle.Language == null ? null : subtitle.Language.Name,
                    Order = subtitle.Order,
                }
            ))
            .ToListAsync(cancellationToken);
    }

    private static Dictionary<int, IReadOnlyList<SubtitleSummary>> GroupSummaries(
        List<SummaryRow> rows,
        Func<SummaryRow, int> ownerId
    ) =>
        rows.GroupBy(ownerId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<SubtitleSummary>)group.Select(row => row.Summary).ToList()
            );

    public async Task<SubtitleDetails> CreateForTrackAsync(
        int albumId,
        int trackId,
        CreateSubtitleRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        await EnsureAlbumTrackExistsAsync(albumId, trackId, cancellationToken);
        int order = await NextOrderAsync(
            subtitle => subtitle.TrackId == trackId,
            cancellationToken
        );

        return await CreateAsync(
            new Subtitle
            {
                TrackId = trackId,
                Content = request.Content,
                Order = order,
                CreatedByUserId = userId,
            },
            request,
            cancellationToken
        );
    }

    public async Task<SubtitleDetails> CreateForConcertFileAsync(
        int concertId,
        int concertFileId,
        CreateSubtitleRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        await EnsureConcertFileExistsAsync(concertId, concertFileId, cancellationToken);
        int order = await NextOrderAsync(
            subtitle => subtitle.ConcertFileId == concertFileId,
            cancellationToken
        );

        return await CreateAsync(
            new Subtitle
            {
                ConcertFileId = concertFileId,
                Content = request.Content,
                Order = order,
                CreatedByUserId = userId,
            },
            request,
            cancellationToken
        );
    }

    public async Task<SubtitleDetails> UpdateAsync(
        int subtitleId,
        UpdateSubtitleRequest request,
        CancellationToken cancellationToken = default
    )
    {
        Subtitle subtitle =
            await dbContext.Subtitles.FirstOrDefaultAsync(
                subtitle => subtitle.Id == subtitleId,
                cancellationToken
            ) ?? throw new EntityNotFoundException($"Subtitle {subtitleId} not found");

        dbContext.Entry(subtitle).Property(s => s.Version).OriginalValue = request.Version;

        await ApplyAsync(
            subtitle,
            request.Title,
            request.Format,
            request.LanguageId,
            request.Content,
            request.Parsed,
            cancellationToken
        );
        subtitle.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return await GetAsync(subtitle.Id, cancellationToken);
    }

    public async Task DeleteAsync(int subtitleId, CancellationToken cancellationToken = default)
    {
        int deleted = await dbContext
            .Subtitles.Where(subtitle => subtitle.Id == subtitleId)
            .ExecuteDeleteAsync(cancellationToken);

        if (deleted == 0)
            throw new EntityNotFoundException($"Subtitle {subtitleId} not found");
    }

    private async Task<SubtitleDetails> CreateAsync(
        Subtitle subtitle,
        CreateSubtitleRequest request,
        CancellationToken cancellationToken
    )
    {
        await ApplyAsync(
            subtitle,
            request.Title,
            request.Format,
            request.LanguageId,
            request.Content,
            request.Parsed,
            cancellationToken
        );

        dbContext.Subtitles.Add(subtitle);
        await dbContext.SaveChangesAsync(cancellationToken);

        return await GetAsync(subtitle.Id, cancellationToken);
    }

    private async Task ApplyAsync(
        Subtitle subtitle,
        string? title,
        SubtitleFormat format,
        int? languageId,
        string content,
        ParsedLyrics? parsed,
        CancellationToken cancellationToken
    )
    {
        if (string.IsNullOrWhiteSpace(content))
            throw new ValidationException("Subtitle content is required.");

        if (subtitle.ConcertFileId != null && !ConcertFileFormats.Contains(format))
            throw new ValidationException("Concert subtitles must be WebVTT, SRT, ASS, or TTML.");
        if (subtitle.TrackId != null && !TrackFormats.Contains(format))
            throw new ValidationException("Track subtitles must be LRC, TTML, or plain text.");

        languageId = languageId is null or 0 ? null : languageId;
        if (
            languageId is not null
            && !await dbContext.Languages.AnyAsync(
                language => language.Id == languageId,
                cancellationToken
            )
        )
            throw new ValidationException($"Language {languageId} does not exist.");

        subtitle.Title = string.IsNullOrWhiteSpace(title) ? null : title.Trim();
        subtitle.Format = format;
        subtitle.LanguageId = languageId;
        subtitle.Content = content;
        subtitle.Parsed = SerializeParsed(subtitle, format, parsed);
    }

    private static readonly JsonSerializerOptions ParsedJsonOptions = new(
        JsonSerializerDefaults.Web
    );

    private static string? SerializeParsed(
        Subtitle subtitle,
        SubtitleFormat format,
        ParsedLyrics? parsed
    )
    {
        bool hasLyrics =
            subtitle.TrackId != null && format is SubtitleFormat.Lrc or SubtitleFormat.Ttml;
        if (!hasLyrics)
        {
            if (parsed is not null)
                throw new ValidationException("Only LRC and TTML track lyrics are parsed.");
            return null;
        }

        if (parsed is null || parsed.Lines.Count == 0)
            throw new ValidationException("No timed lines could be read from these lyrics.");

        HashSet<string> singerIds = parsed.Singers.Select(singer => singer.Id).ToHashSet();
        double previousStart = 0;
        foreach (LyricLine line in parsed.Lines)
        {
            if (line.Start < previousStart)
                throw new ValidationException("Lyric lines must be in time order.");
            previousStart = line.Start;
            if (!double.IsFinite(line.Start) || line.Start < 0 || !double.IsFinite(line.End))
                throw new ValidationException("Lyric lines need valid start and end times.");
            if (line.End < line.Start)
                throw new ValidationException("A lyric line cannot end before it starts.");
            if (line.Singers.Any(id => !singerIds.Contains(id)))
                throw new ValidationException("A lyric line names an unknown singer.");
            if (line.Words.Any(word => !double.IsFinite(word.Start) || word.Start < 0))
                throw new ValidationException("Lyric words need valid start times.");
        }

        return JsonSerializer.Serialize(parsed, ParsedJsonOptions);
    }

    private async Task<int> NextOrderAsync(
        Expression<Func<Subtitle, bool>> predicate,
        CancellationToken cancellationToken
    )
    {
        int? max = await dbContext
            .Subtitles.Where(predicate)
            .MaxAsync(subtitle => (int?)subtitle.Order, cancellationToken);
        return (max ?? -1) + 1;
    }

    private async Task EnsureAlbumTrackExistsAsync(
        int albumId,
        int trackId,
        CancellationToken cancellationToken
    )
    {
        if (
            !await dbContext.AlbumTracks.AnyAsync(
                albumTrack =>
                    albumTrack.TrackId == trackId && albumTrack.AlbumDisc!.AlbumId == albumId,
                cancellationToken
            )
        )
            throw new EntityNotFoundException($"Track {trackId} not found in album {albumId}");
    }

    private async Task EnsureConcertFileExistsAsync(
        int concertId,
        int concertFileId,
        CancellationToken cancellationToken
    )
    {
        if (
            !await dbContext.ConcertFiles.AnyAsync(
                concertFile =>
                    concertFile.Id == concertFileId && concertFile.ConcertId == concertId,
                cancellationToken
            )
        )
            throw new EntityNotFoundException(
                $"Concert file {concertFileId} not found in concert {concertId}"
            );
    }
}
