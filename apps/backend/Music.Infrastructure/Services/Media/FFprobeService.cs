using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Music.Core.Media.FFmpeg;

namespace Music.Infrastructure.Services.Media;

public class FFprobeService(ILogger<FFprobeService> logger) : IMediaProbeService
{
    private readonly JsonSerializerOptions jsonSerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public async Task<MediaProbeResult?> ProbeAsync(
        string filePath,
        CancellationToken cancellationToken = default
    )
    {
        ProcessStartInfo psi = new()
        {
            FileName = "ffprobe",
            Arguments = $"-v error -print_format json -show_format -show_streams \"{filePath}\"",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using Process process = new() { StartInfo = psi };

        try
        {
            process.Start();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to start ffprobe for {FilePath}", filePath);
            return null;
        }

        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);

        await process.WaitForExitAsync(cancellationToken);

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        logger.LogDebug("ffprobe exited with code {ExitCode}", process.ExitCode);

        if (process.ExitCode != 0)
        {
            logger.LogError(
                "ffprobe failed for {FilePath} with exit code {ExitCode}",
                filePath,
                process.ExitCode
            );

            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<MediaProbeResult>(stdout, jsonSerializerOptions);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to deserialize ffprobe output for {FilePath}", filePath);
            return null;
        }
    }
}
