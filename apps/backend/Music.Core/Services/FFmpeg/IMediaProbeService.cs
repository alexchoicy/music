using Music.Core.Models;

namespace Music.Core.Services.FFmpeg;

public interface IMediaProbeService
{
    Task<MediaProbeResult?> ProbeAsync(string filePath);
}
