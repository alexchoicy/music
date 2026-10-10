namespace Music.Core.Media.FFmpeg;

public interface IMediaProbeService
{
    Task<MediaProbeResult?> ProbeAsync(
        string filePath,
        CancellationToken cancellationToken = default
    );
}
