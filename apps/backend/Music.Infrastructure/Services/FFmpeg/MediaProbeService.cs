using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Music.Core.Models;
using Music.Core.Services.FFmpeg;

namespace Music.Infrastructure.Services.FFmpeg;

public sealed class MediaProbeService(
    ILogger<MediaProbeService> logger
) : IMediaProbeService
{
    public async Task<MediaProbeResult?> ProbeAsync(string filePath)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "ffprobe",
            Arguments = $"-v error -print_format json -show_format -show_streams \"{filePath}\"",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = new Process { StartInfo = psi };

        try
        {
            process.Start();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to start ffprobe for {FilePath}", filePath);
            return null;
        }

        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();

        await process.WaitForExitAsync();

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        logger.LogDebug("ffprobe exited with code {ExitCode}", process.ExitCode);

        if (process.ExitCode != 0)
        {
            logger.LogError(
                "ffprobe failed for {FilePath} with exit code {ExitCode}",
                filePath,
                process.ExitCode);

            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<MediaProbeResult>(stdout);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to deserialize ffprobe output for {FilePath}", filePath);
            return null;
        }
    }
}
