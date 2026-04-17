
using Music.Core.Models;

namespace Music.Core.Services.FFmpeg;

public interface IMediaFFmpegService
{
    Task<bool> ConvertToOpusAsync(string inputPath, string outputPath, CancellationToken cancellationToken = default);

    Task<bool> ConvertVideoToAv1DashAsync(
        string inputPath,
        string outputDirectory,
        MediaProbeResult probe,
        CancellationToken cancellationToken = default);

    Task<bool> ExtractTextSubtitleToVttAsync(string inputPath, int streamIndex, string outputPath, CancellationToken cancellationToken = default);

    Task<bool> ExtractPgsSubtitleToSupAsync(string inputPath, int streamIndex, string outputPath, CancellationToken cancellationToken = default);

    Task<bool> ExtractAttachedPictureAsync(
        string inputPath,
        int streamIndex,
        string outputPath,
        CancellationToken cancellationToken = default);

    Task<bool> ExtractVideoThumbnailAsync(
        string inputPath,
        int streamIndex,
        string outputPath,
        double? seekSeconds = null,
        CancellationToken cancellationToken = default);
}
