namespace Music.Core.Services.YouTube;

public interface IYouTubeService
{
    Task<YouTubeVideoInfo> GetVideoInfoAsync(
        string url,
        CancellationToken cancellationToken = default
    );

    Task<CreateYouTubeCoverResult> CreateCoverAsync(
        CreateYouTubeCoverRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );

    Task<YouTubeImportJobStatus> GetImportJobStatusAsync(
        Guid jobId,
        CancellationToken cancellationToken = default
    );

    Task RetryImportJobAsync(Guid jobId, CancellationToken cancellationToken = default);
}
