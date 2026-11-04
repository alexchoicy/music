using Music.Core.Services.Subtitles.Requests;

namespace Music.Core.Services.Subtitles;

public interface ISubtitleService
{
    Task<SubtitleDetails> GetAsync(int subtitleId, CancellationToken cancellationToken = default);

    Task<SubtitleLyrics> GetLyricsAsync(
        int subtitleId,
        CancellationToken cancellationToken = default
    );

    Task<Dictionary<int, IReadOnlyList<SubtitleSummary>>> GetSummariesByTrackAsync(
        IReadOnlyCollection<int> trackIds,
        CancellationToken cancellationToken = default
    );

    Task<Dictionary<int, IReadOnlyList<SubtitleSummary>>> GetSummariesByConcertFileAsync(
        IReadOnlyCollection<int> concertFileIds,
        CancellationToken cancellationToken = default
    );

    Task<SubtitleDetails> CreateForTrackAsync(
        int albumId,
        int trackId,
        CreateSubtitleRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );

    Task<SubtitleDetails> CreateForConcertFileAsync(
        int concertId,
        int concertFileId,
        CreateSubtitleRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );

    Task<SubtitleDetails> UpdateAsync(
        int subtitleId,
        UpdateSubtitleRequest request,
        CancellationToken cancellationToken = default
    );

    Task DeleteAsync(int subtitleId, CancellationToken cancellationToken = default);
}
