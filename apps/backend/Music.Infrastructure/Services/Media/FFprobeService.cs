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
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        foreach (
            string argument in new[]
            {
                "-v",
                "error",
                "-print_format",
                "json",
                "-show_format",
                "-show_streams",
                filePath,
            }
        )
        {
            psi.ArgumentList.Add(argument);
        }

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

        using CancellationTokenRegistration cancellationRegistration = cancellationToken.Register(
            () =>
            {
                try
                {
                    if (!process.HasExited)
                    {
                        process.Kill(entireProcessTree: true);
                    }
                }
                catch { }
            }
        );

        Task<string> stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        Task<string> stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);

        await process.WaitForExitAsync(cancellationToken);

        string stdout = await stdoutTask;
        string stderr = await stderrTask;

        logger.LogDebug("ffprobe exited with code {ExitCode}", process.ExitCode);

        if (process.ExitCode != 0)
        {
            logger.LogError(
                "ffprobe failed for {FilePath} with exit code {ExitCode}: {Error}",
                filePath,
                process.ExitCode,
                stderr
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
