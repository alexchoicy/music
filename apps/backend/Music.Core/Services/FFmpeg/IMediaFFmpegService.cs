
namespace Music.Core.Services.FFmpeg;

public interface IMediaFFmpegService
{
    Task<bool> ConvertToOpusAsync(string inputPath, string outputPath);
}
