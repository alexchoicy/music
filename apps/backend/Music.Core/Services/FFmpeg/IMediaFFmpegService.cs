
using Music.Core.Models;

namespace Music.Core.Services.FFmpeg;

public interface IMediaFFmpegService
{
    Task<bool> ConvertToOpusAsync(string inputPath, string outputPath);

    Task<bool> ConvertVideoToDashAsync(
        string inputPath,
        string outputDirectory,
        MediaProbeResult probe,
        CancellationToken cancellationToken = default)
}
